import express from 'express';
import pg from 'pg';
import cookieParser from 'cookie-parser';
import moment from 'moment';
import methodOverride from 'method-override';
import speciesRouter from './routes/species.js';

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(cookieParser());

const { Pool } = pg;
const pool = new Pool({
  user: 'limjiahao',
  host: 'localhost',
  database: 'bird_watching',
  port: 5432,
});

const getAllNotes = (req, res) => {
  if (!req.cookies.loggedIn) {
    res.status(403).redirect('/login');
    return;
  }

  const sqlQuery = 'SELECT n.*, s.name FROM notes AS n INNER JOIN species AS s ON n.species_id = s.id ORDER BY n.id';

  pool.query(sqlQuery, (err, result) => {
    if (err) {
      console.error('error', err);
      res.status(500).send(err);
      return;
    }

    const notes = result.rows;
    res.render('index', { notes, userName: req.cookies.userName });
  });
};

const getNoteById = (req, res) => {
  if (!req.cookies.loggedIn) {
    res.status(403).redirect('/login');
    return;
  }

  const { id } = req.params;
  const sqlQuery = 'SELECT n.*, s.name FROM notes AS n INNER JOIN species AS s ON n.species_id = s.id WHERE n.id = $1';

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

    const data = result.rows[0];
    if (req.cookies.userName === data.username) {
      data.date_time = moment(data.date_time).format('YYYY-MM-DDTHH:mm');
      data.userName = req.cookies.userName;
      pool.query('SELECT * from species', (speError, speResult) => {
        const categories = speResult.rows;
        res.render('edit-note', { data, categories });
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
  pool.query(sqlQuery, args, (err, result) => {
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

  pool.query('SELECT * from species', (error, result) => {
    const categories = result.rows;
    res.render('new-note', { moment, userName: req.cookies.userName, categories });
  });
};

const createNewNote = (req, res) => {
  const args = Object.values(req.body);
  args.push(req.cookies.userName);

  const sqlQuery = 'INSERT INTO notes (date_time, species_id, behaviour, flock_size, username) VALUES ($1, $2, $3, $4, $5) RETURNING *';

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
      res.render('delete', { userName: req.cookies.userName });
    }
  });
};

const getLoginPage = (req, res) => {
  if (!req.cookies.loggedIn) res.render('login-signup', { page: '/login', loggedOut: true });
  else res.redirect('/');
};

const authUser = (req, res) => {
  const values = [req.body.email];
  pool.query('SELECT * from users WHERE email=$1', values, (error, result) => {
    if (error) {
      console.log('Error executing query', error.stack);
      res.status(503).send(error);
      return;
    }

    if (result.rows.length === 0) {
      res.status(403).redirect('/login');
      return;
    }

    const user = result.rows[0];
    if (user.password === req.body.password) {
      res.cookie('userName', user.username);
      res.cookie('loggedIn', true);
      res.redirect('/');
    } else {
      res.status(403).redirect('/login');
    }
  });
};

const getSignupPage = (req, res) => {
  if (!req.cookies.loggedIn) res.render('login-signup', { page: '/signup', loggedOut: true });
  else res.redirect('/');
};

const createNewUser = (req, res) => {
  const args = Object.values(req.body);
  const sqlQuery = 'INSERT INTO users (email, username, password) VALUES ($1, $2, $3) RETURNING *';

  pool.query(sqlQuery, args, (err, result) => {
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

const logoutUser = (req, res) => {
  if (req.cookies.loggedIn) {
    res.clearCookie('loggedIn');
    res.clearCookie('userName');
  }

  res.redirect('/login');
};

app.get('/', getAllNotes);

app.get('/note/:id', getNoteById);

app
  .route('/note/:id/edit')
  .get(getEditForm)
  .put(editNote);

app
  .route('/note')
  .get(getNewNoteForm)
  .post(createNewNote);

app.delete('/note/:id/delete', deleteNote);

app
  .route('/login')
  .get(getLoginPage)
  .post(authUser);

app
  .route('/signup')
  .get(getSignupPage)
  .post(createNewUser);

app.get('/logout', logoutUser);

app.use('/species', speciesRouter);

app.listen(3004);
