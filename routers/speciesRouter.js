import express from 'express';
import database from '../utils/database.js';

const router = express.Router();

const getNewSpeciesForm = (req, res) => {
  if (!req.cookies.loggedIn) {
    res.status(403).redirect('/login');
    return;
  }

  res.render('new-species', { userName: req.cookies.userName });
};

const addNewSpecies = (req, res) => {
  const args = Object.values(req.body);

  const sqlQuery = 'INSERT INTO species (name, scientific_name) VALUES ($1, $2) RETURNING *';

  database.query(sqlQuery, args, (err, result) => {
    if (err) {
      console.log('error', err);
      res.status(500).send(err);
    } else {
      const { id } = result.rows[0];
      res.redirect(`/species/${id}`);
    }
  });
};

const getSpeciesById = (req, res) => {
  if (!req.cookies.loggedIn) {
    res.status(403).redirect('/login');
    return;
  }

  const { id } = req.params;
  const sqlQuery = 'SELECT * FROM species LEFT JOIN notes ON notes.species_id = species.id WHERE species.id = $1 ORDER BY notes.id';

  database.query(sqlQuery, [id], (err, result) => {
    if (err) {
      console.error('error', err);
      res.status(500).send(err);
      return;
    }

    if (result.rows.length <= 0) {
      res.status(404).send('No species found!');
      return;
    }

    const species = result.rows[0];
    let notes;
    if (result.rows[0].date_time) notes = result.rows;
    else notes = [];
    res.render('species', { species, notes, userName: req.cookies.userName });
  });
};

const getEditSpeciesForm = (req, res) => {
  if (!req.cookies.loggedIn) {
    res.status(403).redirect('/login');
    return;
  }

  const { id } = req.params;
  const sqlQuery = 'SELECT * FROM species WHERE id = $1';

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
    res.render('edit-species', { data, userName: req.cookies.userName });
  });
};

const editSpecies = (req, res) => {
  const { id } = req.params;
  const args = Object.values(req.body);
  args.push(id);
  const sqlQuery = `UPDATE species SET name = $1,
                                    scientific_name = $2
                                  WHERE id = $3`;

  // eslint-disable-next-line no-unused-vars
  database.query(sqlQuery, args, (err, result) => {
    if (err) {
      console.log('error', err);
      res.status(500).send(err);
    } else {
      res.redirect(`/species/${id}`);
    }
  });
};

router
  .route('/')
  .get(getNewSpeciesForm)
  .post(addNewSpecies);

router.get('/:id', getSpeciesById);

router
  .route('/:id/edit')
  .get(getEditSpeciesForm)
  .put(editSpecies);

export default router;
