"use strict";
var express = require("express")
var app = express()
var fs = require('fs'); // HTTPS
var https = require('https'); // HTTPS

//Body-Parser
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//Cookie
const cookieParser = require("cookie-parser");
app.use(cookieParser());

// Hash para passwords
var md5 = require('md5')
const bcrypt = require('bcryptjs'); // Falta usar encriptacion mejor con GetHasehdPassword BCRYPT.

// Token
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
//Secreto TOKEN en Variable
dotenv.config();
process.env.TOKEN_SECRET;


//Router
const router = express.Router();
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

//Servidor Web de la API en HTTPS
app.use(router);
var PORT = 8443 // HTTPS
https.createServer({
  key: fs.readFileSync('my_cert.key'),
  cert: fs.readFileSync('my_cert.crt')
}, app).listen(PORT, () => {
  console.log("Biel HTTPS server con AUTH en HTTPS puerto https://localhost:" + PORT + "");
});

router.get('/', (req, res) => {
  res.status(200).send('Esto es un servidor con autentificacion');
});

//Funcion de encriptacion de comentarios
const crypto = require("crypto");
class Encrypter {
  constructor(encryptionKey) {
    this.algorithm = "aes-192-cbc";
    this.key = crypto.scryptSync(encryptionKey, "salt", 24);
  }

// Otra opcion CryptJS.AES en una sola linea
  encrypt(clearText) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = cipher.update(clearText, "utf8", "hex");
    return [
      encrypted + cipher.final("hex"),
      Buffer.from(iv).toString("hex"),
    ].join("|");
  }

  dencrypt(encryptedText) {
    const [encrypted, iv] = encryptedText.split("|");
    if (!iv) throw new Error("IV not found");
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, "hex")
    );
    return decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8");
  }
}

// Contraseña para encriptado/desencriptado de comentarios
const encrypter = new Encrypter("secret");

//DB autentificacion y subprocesos
const sqlite3 = require('sqlite3').verbose();
const database = new sqlite3.Database("./my.db");
const ForeignKeyON = () => {
  const sqlQuery = 'PRAGMA foreign_keys = ON';
  return database.run(sqlQuery);
}

const createUsersTable = () => {
  const sqlQuery = 'CREATE TABLE IF NOT EXISTS users (id integer PRIMARY KEY, name text, email text UNIQUE, password text, admin text)';
  return database.run(sqlQuery);
}

const createCommentsTable = () => {
  const sqlQuery = 'CREATE TABLE IF NOT EXISTS comments (id integer PRIMARY KEY, userid text, comment text, FOREIGN KEY (userid) REFERENCES users(id))';
  return database.run(sqlQuery);
}


const findUserByEmail = (email, cb) => {
  return database.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
    cb(err, row)
  });
}

const createUser = (user, cb) => {
  return database.run('INSERT INTO users (name, email, password, admin) VALUES (?,?,?,?)', user, (err) => {
    cb(err)
  });
}

const createComment = (userid, cb) => {
  return database.run('INSERT INTO comments (userid, comment) VALUES (?,?)', userid, (err) => {
    cb(err)
  });
}

//Creamos las tablas si no existen

ForeignKeyON();
createUsersTable();
createCommentsTable();

//Verificador de Autorizacion en llamadas a la API via COOKIE
const authorization = (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) {
    return res.sendStatus(403);
  }
  try {
    const data = jwt.verify(token, process.env.TOKEN_SECRET);
    req.userId = data.id;
    req.userAdmin = data.admin;

    return next();
  } catch {
    return res.sendStatus(403);
  }
};

//Endpoints de la API de AUTH.

router.post('/register', (req, res) => {

  const name = req.body.name;
  const email = req.body.email;
  const admin = req.body.admin;
  const password = bcrypt.hashSync(req.body.password);

  createUser([name, email, password, admin], (err) => {
    if (err) return res.status(500).send("Server error!");
    findUserByEmail(email, (err, user) => {
      if (err) return res.status(500).send('Server error!');
      const expiresIn = 24 * 60 * 60;
      const accessToken = jwt.sign({ id: user.id, admin: user.admin }, process.env.TOKEN_SECRET, {
        expiresIn: expiresIn
      });
      res.status(200).send({
        "user": user, "access_token": accessToken, "expires_in": expiresIn
      });
    });
  });
});


router.post('/login', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  findUserByEmail(email, (err, user) => {
    if (err) return res.status(500).send('Server error!');
    if (!user) return res.status(404).send('User not found!');
    const result = bcrypt.compareSync(password, user.password);
    if (!result) return res.status(401).send('Password not valid!');

    const expiresIn = 24 * 60 * 60;
    const accessToken = jwt.sign({ id: user.id, admin: user.admin }, process.env.TOKEN_SECRET, {
      expiresIn: expiresIn
    });

    return res
      .cookie("access_token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "logeado",
      })
      .status(200)
      .redirect('https://127.0.0.1/loged.html');
  });
});

app.get("/logout", authorization, (req, res) => {
  return res
    .clearCookie("access_token")
    .status(200)
    .redirect('https://127.0.0.1/logout.html');

});

//Enpoints de notas

app.post('/newcomment', authorization, (req, res) => {

  const comment = req.body.comment;
  const commentcrypt = encrypter.encrypt(comment);

  createComment([req.userId, commentcrypt], (err) => {
    
    if (err) {
      res.status(500).send("Server error!");
      return;
    }
    res.json({
      "message": "Comentario añadido!",
      "admin": req.userAdmin,
      "user_id": req.userId,
      
    })

  });
});


app.get('/api/comments', authorization, (req, res, next) => {

  var sql = "select users.name, users.email, comments.id, comments.comment FROM users INNER JOIN comments ON users.id = comments.userid;"

  // Verifica si es admin para aceptar la consulta de todos las notas.

  if (req.userAdmin == 'on') {

    database.all(sql, (err, rows) => {
      if (err) {
        res.status(400).json({ "error": err.message });
        return;
      }
      res.json({
        "message": "success",
        "admin": req.userAdmin,
        "data": rows
      })
    });
  }
  else {
    res.json({
      "message": "Usuario No Admin",
      "admin": req.userAdmin
    })
  }
})

app.get('/api/users', authorization, (req, res, next) => {

  var sql = "select * FROM users"

  // Verifica si es admin para aceptar la consulta de todos los usuarios.

  if (req.userAdmin == 'on') {

    database.all(sql, (err, rows) => {
      if (err) {
        res.status(400).json({ "error": err.message });
        return;
      }
      res.json({
        "message": "success",
        "admin": req.userAdmin,
        "data": rows

      })
    });
  }
  else {
    res.json({
      "message": "Usuario No Admin",
      "admin": req.userAdmin
    })

  }

})


app.get('/api/comment', authorization, (req, res, next) => {

  var sql = "select users.name, users.email, comments.id, comments.comment FROM users INNER JOIN comments ON users.id = comments.userid WHERE users.id = ?"

  database.all(sql, req.userId, (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });

    } else {
      for (var i in rows) {
        res.json({
          "name": rows[i].name,
          "email": rows[i].email,
          "comment_number": rows[i].id,
          "comment_encrypt": rows[i].comment,
          "comment_derypt": encrypter.dencrypt((rows[i].comment))
        })
      }

    }
  });

});

// Borrado de notas con restricciones (UserId, Admin, Comentario no existe)

app.post('/api/delcommentuser', authorization, (req, res, next) => {

  const num_comment = req.body.num_comment;

  var sql_userid = "select userid from comments where id = ?"
  database.all(sql_userid, num_comment, (err, rows, fields) => {

    if (err) {
      res.status(400).json({ "error": err.message });
    } else {

      try {
        const userid = rows[0].userid;
        console.log(userid);

        if ((userid == req.userId) || (req.userAdmin == 'on')) {

          var sql = "delete from comments where id = ?"

          database.all(sql, num_comment, (err, result, fields) => {
            if (err) {
              res.status(400).json({ "error": err.message });
            } else {

              res.json({
                message: "Registro borrados",
                //data: result.message
                changes: this
              })
            }
          });


        }
        else {
          res.json({
            "message": "Usuario incorrecto o No Admin no puede borrar comentarios no suyos",
            "Admin": req.userAdmin,
            "UserId Tuyo": req.userId,
            "UserId del Comment a borrar": userid
          })

        }

      } catch (e) {

        res.json({
          "message": "El Commentario no existe!!",
          "Admin": req.userAdmin,
          "UserId Tuyo": req.userId

        })

      }

    }
  });
});

//Respuesta ante consultas de rutas inexistentes

app.use(function (req, res) {
  res.status(404).json({ "error": "Invalid endpoint. V1" });

});
