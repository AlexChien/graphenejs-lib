"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PrivateKey = require("../../ecc/src/PrivateKey");
var key = require("../../ecc/src/KeyUtils");

var _require = require("./state");

var get = _require.get;
var set = _require.set;


var _keyCachePriv = {};
var _keyCachePub = {};

var AccountLogin = function () {
    function AccountLogin() {
        _classCallCheck(this, AccountLogin);

        var state = { loggedIn: false, roles: ["active", "owner", "memo"] };
        this.get = get(state);
        this.set = set(state);

        this.subs = {};
    }

    _createClass(AccountLogin, [{
        key: "addSubscription",
        value: function addSubscription(cb) {
            this.subs[cb] = cb;
        }
    }, {
        key: "setRoles",
        value: function setRoles(roles) {
            this.set("roles", roles);
        }
    }, {
        key: "generateKeys",
        value: function generateKeys(accountName, password, roles, prefix) {
            var start = new Date().getTime();
            if (!accountName || !password) {
                throw new Error("Account name or password required");
            }
            if (password.length < 12) {
                throw new Error("Password must have at least 12 characters");
            }

            var privKeys = {};
            var pubKeys = {};

            (roles || this.get("roles")).forEach(function (role) {
                var seed = accountName + role + password;
                var pkey = _keyCachePriv[seed] ? _keyCachePriv[seed] : PrivateKey.fromSeed(key.normalize_brainKey(seed));
                _keyCachePriv[seed] = pkey;

                privKeys[role] = pkey;
                pubKeys[role] = _keyCachePub[seed] ? _keyCachePub[seed] : pkey.toPublicKey().toString(prefix);

                _keyCachePub[seed] = pubKeys[role];
            });

            return { privKeys: privKeys, pubKeys: pubKeys };
        }
    }, {
        key: "checkKeys",
        value: function checkKeys(_ref) {
            var _this = this;

            var accountName = _ref.accountName;
            var password = _ref.password;
            var auths = _ref.auths;

            if (!accountName || !password || !auths) {
                throw new Error("checkKeys: Missing inputs");
            }
            var hasKey = false;

            var _loop = function _loop(role) {
                var _generateKeys = _this.generateKeys(accountName, password, [role]);

                var privKeys = _generateKeys.privKeys;
                var pubKeys = _generateKeys.pubKeys;

                auths[role].forEach(function (key) {
                    if (key[0] === pubKeys[role]) {
                        hasKey = true;
                        _this.set(role, { priv: privKeys[role], pub: pubKeys[role] });
                    }
                });
            };

            for (var role in auths) {
                _loop(role);
            };

            if (hasKey) {
                this.set("name", accountName);
            }

            this.set("loggedIn", hasKey);

            return hasKey;
        }
    }, {
        key: "signTransaction",
        value: function signTransaction(tr) {
            var _this2 = this;

            var myKeys = {};
            var hasKey = false;

            this.get("roles").forEach(function (role) {
                var myKey = _this2.get(role);
                if (myKey) {
                    hasKey = true;
                    console.log("adding signer:", myKey.pub);
                    tr.add_signer(myKey.priv, myKey.pub);
                }
            });

            if (!hasKey) {
                throw new Error("You do not have any private keys to sign this transaction");
            }
        }
    }]);

    return AccountLogin;
}();

var accountLogin = new AccountLogin();

module.exports = accountLogin;