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
    const sqlQuery2 = 'SELECT note_id, behaviour FROM behaviours INNER JOIN notes_behaviours ON behaviours.id = notes_behaviours.behaviour_id WHERE note_id = $1';
    database.query(sqlQuery2, [id], (behaviourErr, behaviourRes) => {
      if (behaviourErr) {
        console.error('error', behaviourErr);
        res.status(500).send(behaviourErr);
        return;
      }
      const behaviours = behaviourRes.rows;
      const sqlQuery3 = 'SELECT c.*, u.username FROM comments AS c JOIN users AS u ON c.user_id = u.id WHERE c.note_id = $1 ORDER BY c.id';
      database.query(sqlQuery3, [id], (commentErr, commentRes) => {
        if (commentErr) {
          console.error('error', commentErr);
          res.status(500).send(commentErr);
          return;
        }
        const comments = commentRes.rows;
        res.render('note', {
          note, userName: req.cookies.userName, behaviours, comments,
        });
      });
    });
  });
};

const getEditForm = (req, res) => {
  if (!req.cookies.loggedIn) {
    res.status(403).redirect('/login');
    return;
  }

  const { id } = req.params;
  const sqlQuery = 'SELECT n.*, nb.behaviour_id FROM notes AS n LEFT JOIN notes_behaviours AS nb ON n.id = nb.note_id WHERE n.id = $1';

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
    const behaviourIDs = result.rows.map((row) => Number(row.behaviour_id));
    if (req.cookies.userName === data.username) {
      data.date_time = moment(data.date_time).format('YYYY-MM-DDTHH:mm');
      data.userName = req.cookies.userName;
      database.query('SELECT * from species', (speError, speResult) => {
        const categories = speResult.rows;
        database.query('SELECT * FROM behaviours', (behaviourErr, behaviourRes) => {
          const behaviours = behaviourRes.rows;
          res.render('edit-note', {
            data, categories, userName: req.cookies.userName, behaviours, behaviourIDs,
          });
        });
      });
    } else {
      res.redirect(`/note/${id}`);
    }
  });
};

const editNote = (req, res) => {
  const { id } = req.params;
  let behaviourIDs;
  if (typeof req.body.behaviour_ids === 'object') behaviourIDs = req.body.behaviour_ids;
  else if (typeof req.body.behaviour_ids === 'string') behaviourIDs = [req.body.behaviour_ids];
  else behaviourIDs = [];
  delete req.body.behaviour_ids;

  const args = Object.values(req.body);
  args.push(id);
  const sqlQuery = 'UPDATE notes SET date_time = $1, species_id = $2, flock_size = $3 WHERE id = $4';

  // eslint-disable-next-line no-unused-vars
  database.query(sqlQuery, args, (err, result) => {
    if (err) {
      console.log('error', err);
      res.status(500).send(err);
      return;
    }

    const sqlQuery2 = 'DELETE FROM notes_behaviours WHERE note_id = $1';
    // eslint-disable-next-line no-unused-vars
    database.query(sqlQuery2, [id], (deleteErr, deleteRes) => {
      if (deleteErr) {
        console.log('error', deleteErr);
        res.status(500).send(deleteErr);
        return;
      }

      if (behaviourIDs.length > 0) {
        const sqlQuery3 = 'INSERT INTO notes_behaviours (note_id, behaviour_id) VALUES ($1, $2) ON CONFLICT (note_id, behaviour_id) DO NOTHING';
        behaviourIDs.forEach((behaviourID, index) => {
        // eslint-disable-next-line no-unused-vars
          database.query(sqlQuery3, [id, behaviourID], (insertErr, insertRes) => {
            if (insertErr) {
              console.log('error', insertErr);
              res.status(500).send(insertErr);
              return;
            }

            if (index === behaviourIDs.length - 1) res.redirect(`/note/${id}`);
          });
        });
      } else res.redirect(`/note/${id}`);
    });
  });
};

const getNewNoteForm = (req, res) => {
  if (!req.cookies.loggedIn) {
    res.status(403).redirect('/login');
    return;
  }

  database.query('SELECT * from species', (error, result) => {
    const categories = result.rows;
    database.query('SELECT * FROM behaviours', (behaviourErr, behaviourRes) => {
      const behaviours = behaviourRes.rows;
      res.render('new-note', {
        moment, userName: req.cookies.userName, categories, behaviours,
      });
    });
  });
};

const createNewNote = (req, res) => {
  let behaviourIDs;
  if (typeof req.body.behaviour_ids === 'object') behaviourIDs = req.body.behaviour_ids;
  else if (typeof req.body.behaviour_ids === 'string') behaviourIDs = [req.body.behaviour_ids];
  else behaviourIDs = [];
  delete req.body.behaviour_ids;

  const args = Object.values(req.body);
  args.push(req.cookies.userName);

  const sqlQuery = 'INSERT INTO notes (date_time, species_id, flock_size, username) VALUES ($1, $2, $3, $4) RETURNING *';

  database.query(sqlQuery, args, (err, result) => {
    if (err) {
      console.log('error', err);
      res.status(500).send(err);
      return;
    }

    const { id } = result.rows[0];
    if (behaviourIDs.length > 0) {
      const sqlQuery2 = 'INSERT INTO notes_behaviours (note_id, behaviour_id) VALUES ($1, $2)';
      behaviourIDs.forEach((behaviourID, index) => {
        // eslint-disable-next-line no-unused-vars
        database.query(sqlQuery2, [id, behaviourID], (insertErr, insertRes) => {
          if (insertErr) {
            console.log('error', insertErr);
            res.status(500).send(insertErr);
            return;
          }

          if (index === behaviourIDs.length - 1) res.redirect(`/note/${id}`);
        });
      });
    } else res.redirect(`/note/${id}`);
  });
};

const deleteNote = (req, res) => {
  const { id } = req.params;
  const sqlQuery = 'DELETE FROM notes_behaviours WHERE note_id = $1';

  // eslint-disable-next-line no-unused-vars
  database.query(sqlQuery, [id], (err, result) => {
    if (err) {
      console.log('error', err);
      res.status(500).send(err);
      return;
    }
    const sqlQuery2 = 'DELETE FROM comments WHERE note_id = $1';
    // eslint-disable-next-line no-unused-vars
    database.query(sqlQuery2, [id], (commentErr, commentRes) => {
      if (commentErr) {
        console.log('error', commentErr);
        res.status(500).send(commentErr);
        return;
      }
      const sqlQuery3 = 'DELETE FROM notes WHERE id = $1';
      // eslint-disable-next-line no-unused-vars
      database.query(sqlQuery3, [id], (deleteErr, deleteRes) => {
        if (deleteErr) {
          console.log('error', deleteErr);
          res.status(500).send(deleteErr);
          return;
        }
        res.render('delete', { userName: req.cookies.userName });
      });
    });
  });
};

const addComment = (req, res) => {
  const { id } = req.params;
  const args = [req.body.comment, req.cookies.userName, id];

  const sqlQuery = `INSERT INTO comments (comment, user_id, note_id)
                    VALUES ($1, 
                          (SELECT id FROM users WHERE username = $2),
                          $3)`;

  // eslint-disable-next-line no-unused-vars
  database.query(sqlQuery, args, (err, result) => {
    if (err) {
      console.log('error', err);
      res.status(500).send(err);
      return;
    }

    res.redirect(`/note/${id}`);
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

router.post('/:id/comment', addComment);

export default router;
