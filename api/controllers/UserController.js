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
                return res.negotiate(err);
              }
              return res.json(createdUser);
            });
          }
        });
      },
    });
  }
};

