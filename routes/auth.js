var express = require("express");
var passport = require("passport");
var db = require("../db");

var router = express.Router();

router.get("/login/federated/twitter.com", passport.authenticate("twitter"));

router.get(
  "/oauth/callback/twitter.com",
  passport.authenticate("twitter", {
    assignProperty: "federatedUser",
    failureRedirect: "/",
  }),
  function (req, res, next) {
    db.get(
      "SELECT * FROM federated_credentials WHERE provider = ? AND subject = ?",
      ["https://twitter.com", req.federatedUser.id],
      function (err, row) {
        if (err) {
          return next(err);
        }
        if (!row) {
          db.run(
            "INSERT INTO users (name, following) VALUES (?, ?)",
            [req.federatedUser.displayName, req.federatedUser.follows_julien],
            function (err) {
              if (err) {
                return next(err);
              }

              var id = this.lastID;
              db.run(
                "INSERT INTO federated_credentials (provider, subject, user_id) VALUES (?, ?, ?)",
                ["https://twitter.com", req.federatedUser.id, id],
                function (err) {
                  if (err) {
                    return next(err);
                  }
                  var user = {
                    id: id.toString(),
                    displayName: req.federatedUser.displayName,
                  };
                  req.login(user, function (err) {
                    if (err) {
                      return next(err);
                    }
                    res.redirect("/");
                  });
                }
              );
            }
          );
        } else {
          db.get(
            "SELECT rowid AS id, username, name, following FROM users WHERE rowid = ?",
            [row.user_id],
            function (err, row) {
              if (err) {
                return next(err);
              }

              // TODO: Handle undefined row.
              var user = {
                id: row.id.toString(),
                username: row.username,
                displayName: row.name,
                following: row.following,
              };
              console.log(user);
              req.login(user, function (err) {
                if (err) {
                  return next(err);
                }
                res.redirect("/");
              });
            }
          );
        }
      }
    );
  }
);

router.get("/logout", function (req, res, next) {
  req.logout();
  res.redirect("/");
});

module.exports = router;