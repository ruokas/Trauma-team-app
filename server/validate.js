module.exports = function validate(schema) {
  return function (req, res, next) {
    const { error, value } = schema.validate(req.body);
    if (error) {
      error.status = 400;
      return next(error);
    }
    req.body = value;
    next();
  };
};
