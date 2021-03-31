const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT;
const jwtSecret = process.env.JWT_SECRET;
const myPool = mysql.createPool(
    {
        user:process.env.DB_USER,
        password:process.env.DB_PASSWORD,
        database:"mediconcen",
        host:process.env.DB_HOST,
    });
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.get('/',function(req,res)
{
    res.send({message:'Default route'});
});

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (token == null) return res.sendStatus(401)

    jwt.verify(token, jwtSecret, (err, user) => {
        console.log(err)

        if (err) return res.sendStatus(403)

        req.user = user
        next()
    })
}

app.post('/signup', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;
    let clinicName = req.body.clinicName;
    let phoneNumber = req.body.phoneNumber;
    let address = req.body.address;

    myPool.getConnection((err, poolConnection) => {
        if(err){
            res.send({
                message: 'error making signup connection',
            });
            poolConnection.release();
        } else {
            myPool.query('SELECT COUNT(*) AS EmailCount FROM user WHERE email = ? ',[email], (err, result, fields)=> {
                if(err){
                    console.log(err + ' occured when selecting count');
                    poolConnection.release();
                } else {
                    let emailCount = result[0].EmailCount;
                    if(emailCount === 1) {
                        res.send({
                            message: 'This email address is already associated with and account',
                        })
                    } else {
                        let saltRound = 10;
                        bcrypt.hash(password, saltRound, function(err, myHash) {
                            myPool.query('INSERT INTO user (email, password, clinic_name, phone_number, address) VALUES (?,?,?,?,?)', [email, myHash, clinicName, phoneNumber, address], (err, insertResults, insertFields) => {
                                if(err){
                                    console.log(err + ' when inserting data into db');
                                } else{
                                    res.send({
                                        message: 'User inserted!'
                                    });
                                }
                            })
                        })
                    }
                }
            })
        }
        poolConnection.release()
    })
})

app.post('/login', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    myPool.getConnection((err, poolConnection) => {
        if(err){
            console.log(err)
            res.send({
                message: 'error making signup connection',
            });
            poolConnection.release();
        } else {
            myPool.query('SELECT COUNT(*) AS EmailCount FROM user WHERE email = ? ',[email], (err, result, fields)=> {
                if(err){
                    console.log(err + ' occured when selecting count');
                    poolConnection.release();
                } else {
                    let emailCount = result[0].EmailCount;
                    if(emailCount === 0) {
                        res.send({
                            message: 'No account associated with this email',
                        })
                    } else {
                        myPool.query('SELECT user_id,password FROM user WHERE email = ?',[email],function(err,idPassResults,idPassFields) {
                            if (err) {
                                res.send({message: 'Error selecting user info: ' + err});
                            } else {
                                let userPassword = idPassResults[0].password;
                                let userID = idPassResults[0].user_id;
                                bcrypt.compare(req.body.password,userPassword)
                                    .then(result=>{
                                        if(result){
                                            const token = jwt.sign({userID: userID }, jwtSecret, {expiresIn: '1h'});
                                            res.status(200).send({token:token})
                                        } else {
                                            res.sendStatus(401).send({token:''})
                                        }
                                    });
                        }});
                    }
                }
            })
            poolConnection.release()
        }
    })
})

app.get('/record', authenticateToken, (req, res) => {
    let userId = req.user.userID;
    myPool.getConnection((err, poolConnection) => {
        if(err) {
            res.send({
                message: 'error making get record connection',
            });
            poolConnection.release();
        } else {
            myPool.query('SELECT * FROM record WHERE user_id=?',[userId], (err, result, fields)=> {
                if(err){
                    res.send({
                        message: 'error getting record',
                    })
                } else {
                    res.send(result);
                }
            })
        }
        poolConnection.release();
    })
})

app.get('/record/:id', authenticateToken, (req, res) => {
    let recordId = req.params.id;
    myPool.getConnection((err, poolConnection) => {
        if(err) {
            res.send({
                message: 'error making get record connection',
            });
            poolConnection.release();
        } else {
            myPool.query('SELECT * FROM record WHERE record_id=?',[recordId], (err, result, fields)=> {
                if(err){
                    res.send({
                        message: 'error getting record',
                    })
                } else {
                    if(result[0].user_id != req.user.userID){
                        res.status(403).send({message:'You do not have permission to view this record'})
                    } else {
                        res.send(result[0]);
                    }
                }
            })
        }
        poolConnection.release();
    })
})

app.post('/record', authenticateToken, (req, res) => {
    let userId = req.user.userID;
    let doctorName = req.body.doctorName;
    let patientName = req.body.patientName;
    let diagnosis = req.body.diagnosis;
    let medication = req.body.medication;
    let consultationFee = req.body.consultationFee;
    let hasFollowUp = req.body.hasFollowUp;
    console.log('record')
    myPool.getConnection((err, poolConnection) => {
        if(err){
            res.send({
                message: 'error making add record connection',
            });
            poolConnection.release();
        } else {
            myPool.query('INSERT INTO record (user_id, doctor_name, patient_name, diagnosis, medication, consultation_fee, has_follow_up) VALUES (?,?,?,?,?,?,?)', [userId, doctorName, patientName, diagnosis,medication,consultationFee,hasFollowUp], (err, insertResults, insertFields) => {
                                if(err){
                                    console.log(err + ' when inserting data into db');
                                } else{
                                    res.send({
                                        message: 'Record inserted!'
                                    });
                                }
                            })
                        }
        poolConnection.release()
    })
})

app.listen(PORT,()=>{
    console.log(`Listening on PORT: ${PORT}`);
});
