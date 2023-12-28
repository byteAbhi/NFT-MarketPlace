// app.js
const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');
const bodyParser = require('body-parser');
const path = require('path');
const mysql = require('mysql');
 

//creating connection
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Test@123',
    database: 'nodejs'
  };
// Create a new connection
const connection = mysql.createConnection(dbConfig);

// Connect to the MySQL server
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
    return;
  }

  console.log('Connected to MySQL!');
});

//Set up session and flash:
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false
  }));
  
  app.use(flash());

//Add middleware for form data parsing:

app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'asset')));
app.use(express.static('public'));
// app.use('/public', express.static(path.join(__dirname, "public")))
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
//Add a middleware function to check if the user is already logged in:
const checkLoggedIn = (req, res, next) => {
  if (req.session.user) {
    return res.render('error', { message: 'You are already logged in.' });
  }
  next();
};


  app.get('/live', (req, res) => {
    res.render('live');
});
app.get('/reg', (req, res) => {
    res.render('reg');
});

app.get('/collection', (req, res) => {
  res.render('collection');
});

 

//Add routes for login and signup:
app.get('/', (req, res) => {
  res.render('index');
});
 
 
 

app.get('/log', checkLoggedIn, (req, res) => {
  res.render('log', { messages: req.flash('error') });
});

 
// app.get('/signup', checkLoggedIn, (req, res) => {
//   res.render('signup', { messages: req.flash('error') });
// });


 

app.post('/log', async (req, res) => {
  const { username, password } = req.body;

  const user = await getUser(username);
  console.log('Retrieved user:', user);
  if (user && await bcrypt.compare(password, user.user_pass)) {
    req.session.user = user;
    res.redirect('/nft_MktP');
    console.log("login successfully")
  } else {
    req.flash('error', 'Invalid username or password');
    console.log("login error")
    res.redirect('/log');
  }
});

app.post('/reg', async (req, res) => {
  const {   username,email, password } = req.body;
  
  const hashedPassword = await bcrypt.hash(password, 10);
// Server-side validation
if (  !username  ||!email || !password) {
  req.flash('error', 'All fields are required');
  return res.redirect('/log');
}

if (!/^[A-Za-z\s]+$/.test(username)) {
  req.flash('error', 'Name must contain only letters and spaces');
  return res.redirect('/log');
}

 
const query = 'INSERT INTO loginuser ( email , user_pass,username) VALUES (?, ?, ? )';
connection.query(query, [ email, hashedPassword,username], (err, results) => {
  if (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      if (err.message.includes('username')) {
        console.log(err)
        req.flash('error', 'Username already exists');
      } else if (err.message.includes('email')) {
        console.log(err)
        req.flash('error', 'Email already exists');
      } else {
        throw err;
      }
      res.redirect('/log');
      
    } else {
      throw err;
    }
  } else {
    req.flash('success', 'Account created successfully');
    console.log("succesfully")
       // Send email notification
     
      res.redirect('/log');
    }
  });
});


const getUser = (username) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM loginuser WHERE username = ?';
    connection.query(query, [username], (err, results) => {
      if (err) { 
        reject(err);
        console.log("invalid");
      } else {
        console.log('Results from getUser query:', results);
        resolve(results[0]);
      }
    });
  });
};


//   Add a route for the dashboard (you'll create this view later):
app.get('/nft_MktP', (req, res) => {
  if (req.session.user) {
    res.render('nft_MktP', { user: req.session.user });
  } else {
    res.redirect('/log');
  }
});

//   Add a route to handle user logout:
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) throw err;
    res.redirect('/');
  });
});


 

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
