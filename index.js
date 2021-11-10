import express from 'express';
import pg from 'pg';
import moment from 'moment';

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));

const { Pool } = pg;
const pool = new Pool({
  user: 'limjiahao',
  host: 'localhost',
  database: 'bird_watching',
  port: 5432,
});

const getAllNotes = (req, res) => {
  const sqlQuery = 'SELECT * FROM notes';

  pool.query(sqlQuery, (err, result) => {
    if (err) {
      console.error('error', err);
      res.status(500).send(err);
      return;
    }

    const notes = result.rows.map((note, index) => ({ ...note, index: index + 1 }));
    res.render('index', { notes });
  });
};

const getNoteById = (req, res) => {
  const { id } = req.params;
  const sqlQuery = `SELECT * FROM notes WHERE id = ${id}`;

  pool.query(sqlQuery, (err, result) => {
    if (err) {
      console.error('error', err);
      res.status(500).send(err);
      return;
    }

    if (result.rows.length <= 0) {
      console.log('No note found!');
      res.status(404).send('No note found!');
      return;
    }

    const note = result.rows[0];
    note.date_time = moment(note.date_time).format('dddd, MMMM Do, YYYY, hh:mma');
    res.render('note', { note });
  });
};

const createNewNote = (req, res) => {
  const args = Object.values(req.body);
  const sqlQuery = 'INSERT INTO notes (date_time, behaviour, flock_size) VALUES ($1, $2, $3)';

  pool.query(sqlQuery, args, (err, result) => {
    if (err) {
      console.log('error', err);
      res.status(500).send(err);
    } else {
      console.log('Inserted!');
      res.redirect('/');
    }
  });
};

app.get('/', getAllNotes);

app.get('/note/:id', getNoteById);

app
  .route('/note')
  .get((req, res) => { res.render('new-note'); })
  .post(createNewNote);

app.listen(3004);
