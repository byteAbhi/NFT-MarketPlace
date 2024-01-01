// app.js
// Import the 'dotenv' package
require('dotenv').config();
const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const flash = require('express-flash');
const bodyParser = require('body-parser');
const path = require('path');
const mysql = require('mysql2');





// Access environment variables
const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_DATABASE;
const secretKey = process.env.SESSION_SECRET;
;

//creating connection
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 10, // Adjust as needed
  connectTimeout: 60000, // 60 seconds
  };

  // const sessionStore = new MySQLStore({
  //   // MySQL connection options
  //   expiration: 86400000, // Session lifetime in milliseconds (1 day)
  //   createDatabaseTable: true, // Create the sessions table if it doesn't exist
  //   schema: {
  //     tableName: 'sessions',
  //     columnNames: {
  //       session_id: 'session_id',
  //       expires: 'expires',
  //       data: 'data',
  //     },
  //   },
  // }, mysql.createPool(dbConfig));
  
  app.use(
    session({
      // store: sessionStore,
      secret:  process.env.SESSION_SECRET, // Set your secret key here
      resave: false,
      saveUninitialized: true,
    })
  );



// Create a new connection
const pool = mysql.createPool(dbConfig);

// Connect to the MySQL server
// Use the pool's 'acquire' event to log when a connection is acquired
pool.on('acquire', (connection) => {
  console.log('Connection %d acquired', connection.threadId);
});

// Use the pool's 'connection' event to log when a new connection is made within the pool
pool.on('connection', (connection) => {
  console.log('New connection made within the pool: %d', connection.threadId);
});

// Use the pool's 'enqueue' event to log when a callback is added to the waiting list
pool.on('enqueue', () => {
  console.log('Waiting for available connection slot');
});

// Use the pool's 'release' event to log when a connection is released back to the pool
pool.on('release', (connection) => {
  console.log('Connection %d released', connection.threadId);
});

 

//Add middleware for form data parsing:

app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'asset')));
app.use(express.static('public'));
// app.use('/public', express.static(path.join(__dirname, "public")))
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
//Add a middleware function to check if the user is already logged in:
 

  app.get('/live', (req, res) => {
    res.render('live');
});
app.get('/reg', (req, res) => {
    res.render('reg');
});

app.get('/collection', (req, res) => {
  res.render('collection');
});
app.get('/log', (req, res) => {
  res.render('log');
});

 

//Add routes for login and signup:
app.get('/', (req, res) => {
  res.render('index');
});
app.get('/nft_Mktp', (req, res) => {
  res.render('nft_Mktp');
});
 
 
 
app.post('/log', async (req, res) => {
  const { username, password } = req.body;

  const user = await getUser(username);
  console.log('Retrieved user:', user);
  if (user && await bcrypt.compare(password, user.user_pass)) {
    req.session.user = user;
    res.redirect('/nft_MktP');
    console.log("login successfully")
  } else {
     
    console.log("login error")
    res.redirect('/log');
  }
});

app.post('/reg', async (req, res) => {
  const { username, email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  // Server-side validation
  if (!username || !email || !password) {
    return res.redirect('/log');
  }

  if (!/^[A-Za-z\s]+$/.test(username)) {
    return res.redirect('/log');
  }

  const query = 'INSERT INTO loginuser (email, user_pass, username) VALUES (?, ?, ?)';
  
  // Use the pool to get a connection
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting MySQL connection:', err.message);
      res.redirect('/log');
      return;
    }

    connection.query(query, [email, hashedPassword, username], (err, results) => {
      // Release the connection back to the pool
      connection.release();

      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          if (err.message.includes('username')) {
            console.log(err);
          } else if (err.message.includes('email')) {
            console.log(err);
          } else {
            console.error('Unexpected error:', err);
          }
          res.redirect('/log');
        } else {
          console.error('Error executing query:', err);
          res.redirect('/log');
        }
      } else {
        console.log('Successfully inserted into loginuser');
        // Send email notification
        res.redirect('/log');
      }
    });
  });
});

const getUser = (username) => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        console.error('Error getting MySQL connection:', err.message);
        reject(err);
        return;
      }

      const query = 'SELECT * FROM loginuser WHERE username = ?';
      connection.query(query, [username], (err, results) => {
        // Release the connection back to the pool
        connection.release();

        if (err) {
          console.error('Error executing query:', err.message);
          reject(err);
        } else {
          console.log('Results from getUser query:', results);
          resolve(results[0]);
        }
      });
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
process.on('SIGINT', () => {
  pool.end((err) => {
    if (err) {
      console.error('Error ending MySQL connection:', err.message);
    }
    process.exit();
  });
});
