import express from 'express';
import cookieParser from 'cookie-parser';
import methodOverride from 'method-override';
import homeRouter from './routers/homeRouter.js';
import loginRouter from './routers/loginRouter.js';
import signupRouter from './routers/signupRouter.js';
import logoutRouter from './routers/logoutRouter.js';
import noteRouter from './routers/noteRouter.js';
import speciesRouter from './routers/speciesRouter.js';

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(cookieParser());

app.use('/', homeRouter);
app.use('/login', loginRouter);
app.use('/signup', signupRouter);
app.use('/logout', logoutRouter);
app.use('/note', noteRouter);
app.use('/species', speciesRouter);

app.listen(3004, () => console.log('App listening on port 3004'));
