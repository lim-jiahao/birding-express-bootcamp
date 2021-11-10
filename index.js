import express from 'express';
import pg from 'pg';
import moment from 'moment';
import methodOverride from 'method-override';

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));

const { Pool } = pg;
const pool = new Pool({
  user: 'limjiahao',
  host: 'localhost',
  database: 'bird_watching',
  port: 5432,
});

const getAllNotes = (req, res) => {
  const sqlQuery = 'SELECT * FROM notes ORDER BY id';

  pool.query(sqlQuery, (err, result) => {
    if (err) {
      console.error('error', err);
      res.status(500).send(err);
      return;
    }

    const notes = result.rows;
    res.render('index', { notes });
  });
};

const getNoteById = (req, res) => {
  const { id } = req.params;
  const sqlQuery = 'SELECT * FROM notes WHERE id = $1';

  pool.query(sqlQuery, [id], (err, result) => {
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
    res.render('note', { note });
  });
};

const getEditForm = (req, res) => {
  const { id } = req.params;
  const sqlQuery = 'SELECT * FROM notes WHERE id = $1';

  pool.query(sqlQuery, [id], (err, result) => {
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
    note.date_time = moment(note.date_time).format('YYYY-MM-DDTHH:mm');
    res.render('edit-note', note);
  });
};

const editNote = (req, res) => {
  const { id } = req.params;
  const args = Object.values(req.body);
  args.push(id);
  const sqlQuery = `UPDATE notes SET date_time = $1,
                                    behaviour = $2,
                                    flock_size = $3
                                  WHERE id = $4`;

  // eslint-disable-next-line no-unused-vars
  pool.query(sqlQuery, args, (err, result) => {
    if (err) {
      console.log('error', err);
      res.status(500).send(err);
    } else {
      res.redirect(`/note/${id}`);
    }
  });
};

const createNewNote = (req, res) => {
  const args = Object.values(req.body);
  const sqlQuery = 'INSERT INTO notes (date_time, behaviour, flock_size) VALUES ($1, $2, $3) RETURNING *';

  pool.query(sqlQuery, args, (err, result) => {
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
  pool.query(sqlQuery, [id], (err, result) => {
    if (err) {
      console.log('error', err);
      res.status(500).send(err);
    } else {
      res.render('delete');
    }
  });
};

app.get('/', getAllNotes);

app.get('/note/:id', getNoteById);

app
  .route('/note/:id/edit')
  .get(getEditForm)
  .put(editNote);

app
  .route('/note')
  .get((req, res) => { res.render('new-note', { moment }); })
  .post(createNewNote);

app.delete('/note/:id/delete', deleteNote);

app.listen(3004);
