import express from 'express';
import database from '../utils/database.js';

const router = express.Router();

const getAllNotes = (req, res) => {
  if (!req.cookies.loggedIn) {
    res.status(403).redirect('/login');
    return;
  }

  const sqlQuery = 'SELECT n.*, s.name FROM notes AS n INNER JOIN species AS s ON n.species_id = s.id ORDER BY n.id';

  database.query(sqlQuery, (err, result) => {
    if (err) {
      console.error('error', err);
      res.status(500).send(err);
      return;
    }

    const notes = result.rows;
    res.render('index', { notes, userName: req.cookies.userName });
  });
};

router.get('/', getAllNotes);

export default router;
