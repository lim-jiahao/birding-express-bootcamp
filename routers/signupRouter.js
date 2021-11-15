import express from 'express';
import JSSHA from 'jssha';
import database from '../utils/database.js';

const router = express.Router();

const getSignupPage = (req, res) => {
  if (!req.cookies.loggedIn) res.render('login-signup', { page: '/signup', loggedOut: true });
  else res.redirect('/');
};

const createNewUser = (req, res) => {
  const shaObj = new JSSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
  shaObj.update(req.body.password);
  const hashedPassword = shaObj.getHash('HEX');

  const args = Object.values(req.body);
  args.pop();
  args.push(hashedPassword);
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
