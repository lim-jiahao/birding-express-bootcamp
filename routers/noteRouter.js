import express from 'express';
import moment from 'moment';
import database from '../utils/database.js';

const router = express.Router();

const getNoteById = (req, res) => {
  if (!req.cookies.loggedIn) {
    res.status(403).redirect('/login');
    return;
  }

  const { id } = req.params;
  const sqlQuery = 'SELECT n.*, s.name FROM notes AS n INNER JOIN species AS s ON n.species_id = s.id WHERE n.id = $1';

  database.query(sqlQuery, [id], (err, result) => {
    if (err) {
      console.error('error', err);
      res.status(500).send(err);
      return;
    }

    if (result.rows.length <= 0) {
      res.status(404).send('No note found!');
      return;
    }

    const note = result.rows[0];
    note.date_time = moment(note.date_time).format('dddd, MMMM Do, YYYY, hh:mma');
    res.render('note', { note, userName: req.cookies.userName });
  });
};

const getEditForm = (req, res) => {
  if (!req.cookies.loggedIn) {
    res.status(403).redirect('/login');
    return;
  }

  const { id } = req.params;
  const sqlQuery = 'SELECT * FROM notes WHERE id = $1';

  database.query(sqlQuery, [id], (err, result) => {
    if (err) {
      console.error('error', err);
      res.status(500).send(err);
      return;
    }

    if (result.rows.length <= 0) {
      res.status(404).send('No note found!');
      return;
    }

    const data = result.rows[0];
    if (req.cookies.userName === data.username) {
      data.date_time = moment(data.date_time).format('YYYY-MM-DDTHH:mm');
      data.userName = req.cookies.userName;
      database.query('SELECT * from species', (speError, speResult) => {
        const categories = speResult.rows;
        res.render('edit-note', { data, categories, userName: req.cookies.userName });
      });
    } else {
      res.redirect(`/note/${id}`);
    }
  });
};

const editNote = (req, res) => {
  const { id } = req.params;
  const args = Object.values(req.body);
  args.push(id);
  const sqlQuery = `UPDATE notes SET date_time = $1,
                                    species_id = $2,
                                    behaviour = $3,
                                    flock_size = $4
                                  WHERE id = $5`;

  // eslint-disable-next-line no-unused-vars
  database.query(sqlQuery, args, (err, result) => {
    if (err) {
      console.log('error', err);
      res.status(500).send(err);
    } else {
      res.redirect(`/note/${id}`);
    }
  });
};

const getNewNoteForm = (req, res) => {
  if (!req.cookies.loggedIn) {
    res.status(403).redirect('/login');
    return;
  }

  database.query('SELECT * from species', (error, result) => {
    const categories = result.rows;
    res.render('new-note', { moment, userName: req.cookies.userName, categories });
  });
};

const createNewNote = (req, res) => {
  const args = Object.values(req.body);
  args.push(req.cookies.userName);

  const sqlQuery = 'INSERT INTO notes (date_time, species_id, behaviour, flock_size, username) VALUES ($1, $2, $3, $4, $5) RETURNING *';

  database.query(sqlQuery, args, (err, result) => {
    if (err) {
      console.log('error', err);
      res.status(500).send(err);
    } else {
      const { id } = result.rows[0];
      res.redirect(`/note/${id}`);
    }
  });
};

const deleteNote = (req, res) => {
  const { id } = req.params;
  const sqlQuery = 'DELETE FROM notes WHERE id = $1';

  // eslint-disable-next-line no-unused-vars
  database.query(sqlQuery, [id], (err, result) => {
    if (err) {
      console.log('error', err);
      res.status(500).send(err);
    } else {
      res.render('delete', { userName: req.cookies.userName });
    }
  });
};

router.get('/:id', getNoteById);

router
  .route('/:id/edit')
  .get(getEditForm)
  .put(editNote);

router
  .route('/')
  .get(getNewNoteForm)
  .post(createNewNote);

router.delete('/:id/delete', deleteNote);

export default router;
