import express from 'express';
import database from '../utils/database.js';

const router = express.Router();

const getSignupPage = (req, res) => {
  if (!req.cookies.loggedIn) res.render('login-signup', { page: '/signup', loggedOut: true });
  else res.redirect('/');
};

const createNewUser = (req, res) => {
  const args = Object.values(req.body);
  const sqlQuery = 'INSERT INTO users (email, username, password) VALUES ($1, $2, $3) RETURNING *';

  database.query(sqlQuery, args, (err, result) => {
    if (err) {
      console.log('error', err);
      res.status(500).send(err);
    } else {
      res.cookie('userName', result.rows[0].username);
      res.cookie('loggedIn', true);
      res.redirect('/');
    }
  });
};

router
  .route('/')
  .get(getSignupPage)
  .post(createNewUser);

export default router;
