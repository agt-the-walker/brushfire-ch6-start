/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

const Emailaddresses = require('machinepack-emailaddresses');
const Passwords = require('machinepack-passwords');
const Gravatar = require('machinepack-gravatar');

module.exports = {
  signup: (req, res) => {
    if (_.isUndefined(req.param('email'))) {
      return res.badRequest('An email address is required!');
    }

    if (_.isUndefined(req.param('password'))) {
      return res.badRequest('A password is required!');
    }

    if (req.param('password').length < 6) {
      return res.badRequest('Password must be at least 6 characters!');
    }

    if (_.isUndefined(req.param('username'))) {
      return res.badRequest('A username is required!');
    }

    if (req.param('username').length < 6) {
      return res.badRequest('Username must be at least 6 characters!');
    }

    if (!_.isString(req.param('username')) ||
        req.param('username').match(/[^a-z0-9]/i)) {
      return res.badRequest('Invalid username: must consist of numbers and letters only.');
    }

    Emailaddresses.validate({
      string: req.param('email')
    }).exec({
      error: err => {
        return res.serverError(err);
      },
      invalid: () => {
        return res.badRequest('Doesn\'t look like an email address to me!');
      },
      success: () => {
        Passwords.encryptPassword({
          password: req.param('password')
        }).exec({
          error: err => {
            return res.serverError(err);
          },
          success: result => {
            try {
              var gravatarURL = Gravatar.getImageUrl({
                emailAddress: req.param('email'),
              }).execSync();
            } catch (err) {
              return res.serverError(err);
            }

            const options = {
              email: req.param('email'),
              username: req.param('username'),
              encryptedPassword: result,
              gravatarURL: gravatarURL
            };

            User.create(options).exec((err, createdUser) => {
              if (err) {
                if (err.invalidAttributes && err.invalidAttributes.email &&
                    err.invalidAttributes.email[0] &&
                    err.invalidAttributes.email[0].rule === 'unique') {
                  return res.alreadyInUse(err);
                }

                if (err.invalidAttributes && err.invalidAttributes.username &&
                    err.invalidAttributes.username[0] &&
                    err.invalidAttributes.username[0].rule === 'unique') {
                  return res.alreadyInUse(err);
                }

                return res.negotiate(err);
              }

              return res.json(createdUser);
            });
          }
        });
      },
    });
  },

  profile: (req, res) => {

    User.findOne(req.param('id')).exec((err, user) => {

      if (err) return res.negotiate(err);

      if (!user) return res.notFound();

      const options = {
        email: user.email,
        username: user.username,
        gravatarURL: user.gravatarURL,
        deleted: user.deleted,
        admin: user.admin,
        banned: user.banned,
        id: user.id
      };

      return res.json(user);
    });
  },

  removeProfile: (req, res) => {

    if (!req.param('id')) {
      return res.badRequest('id is a required parameter.');
    }

    User.update({
      id: req.param('id')
    },{
      deleted: true
    }, (err, removedUser) => {
      if (err) return res.negotiate(err);
      if (removedUser.length === 0) {
        return res.notFound();
      }
      return res.ok();
    });
  },

  restoreProfile: (req, res) => {

    User.findOne({
      email: req.param('email')
    }, (err, user) => {
      if (err) return res.negotiate(err);
      if (!user) return res.notFound();

      Passwords.checkPassword({
        passwordAttempt: req.param('password'),
        encryptedPassword: user.encryptedPassword
      }).exec({

        error: err => {
          return res.negotiate(err);
        },

        incorrect: () => {
          return res.notFound();
        },

        success: () => {
          User.update({
            id: user.id
          }, {
            deleted: false
          }).exec((err, updatedUser) => {
            return res.json(updatedUser);
          });
        }
      });
    });
  },

  restoreGravatarURL: (req, res) => {

    try {
      const restoredGravatarURL = gravatarURL = Gravatar.getImageUrl({
        emailAddress: req.param('email')
      }).execSync();

      return res.json(restoredGravatarURL);
    } catch (err) {
      return res.serverError(err);
    }
  },

  updateProfile: (req, res) => {

    User.update({
      id: req.param('id')
    }, {
      gravatarURL: req.param('gravatarURL')
    }, (err, updatedUser) => {

      if (err) return res.negotiate(err);

      return res.json(updatedUser);

    });
  },

  changePassword: (req, res) => {

    if (_.isUndefined(req.param('password'))) {
      return res.badRequest('A password is required!');
    }

    if (req.param('password').length < 6) {
      return res.badRequest('Password must be at least 6 characters!');
    }

    Passwords.encryptPassword({
      password: req.param('password'),
    }).exec({
      error: err => {
        return res.serverError(err);
      },
      success: result => {

        User.update({
          id: req.param('id')
        }, {
          encryptedPassword: result
        }).exec((err, updatedUser) => {
          if (err) {
            return res.negotiate(err);
          }
          return res.json(updatedUser);
        });
      }
    });
  },

  adminUsers: (req, res) => {
    User.find().exec((err, users) => {

      if (err) return res.negotiate(err);

      return res.json(users);

    });
  }
};
