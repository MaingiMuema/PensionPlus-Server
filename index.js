const express = require('express');
const app = express();
const isAuth = require('./isAuth');
const nodemailer = require("nodemailer");

require('dotenv').config();

const mysql = require('mysql');

const cors = require('cors');

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');

//Password encryption modules
const bcrypt = require('bcrypt');
const saltRounds = 10;
 
app.use(cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
}));

app.use(cookieParser());//Express middleware for easier cookie handling
app.use(bodyParser.urlencoded({ extended: true }));//Supports URL encoded bodies

const sessionConfig = {
    name: 'userSession',
    secret: process.env.cookieSECRET,
    cookie: {
        maxAge: 1000 * 60 * 60,
        secure: false,
        httpOnly: true,
    },
    saveUninitialized: true,
    resave: false,
}


app.use(session(sessionConfig));


app.use(express.json());//Supports JSON-encoded bodies

const db = mysql.createConnection({
    user: 'root',
    host: 'localhost',
    password: '',
    database: 'pensionplus'
});

//1. Create account

app.post('/create', async(req, res) => {
    //Create account details
        const name = req.body.name;
        const email = req.body.email;
        const password = req.body.password;

        db.query("SELECT * FROM userAccount WHERE email = ?;",
        email,
        (err, result)=>{
            if(err){
                console.log({err : err});
            }
            else if(result.length > 0){
                res.send("A username with that email already exists! Try logging in");
            }
            else{
                bcrypt.hash(password, saltRounds, (err, hash) =>{

                    if(err){
                        console.log(err);
                    }
        
                    db.query("INSERT INTO userAccount (name, email, password) VALUES (?, ?, ?);", 
                    [name, email, hash], 
                    (err, result) =>{
                        if(err){
                            console.log(err);
                        }
                        else{                          
                            res.send("Values Inserted");
                        }
                    }
                    );
                })
        
            }
        }
        )

       
       
});

//2. Login a user

app.post('/login', (req, res) => {
    //login details
        const email = req.body.email;
        const password = req.body.password;

        db.query("SELECT * FROM userAccount WHERE email = ?;", 
        email,
        (err, result) =>{
            if(err){
                console.log({err : err});
            }
            if(result.length > 0){
               bcrypt.compare(password, result[0].password, (error, response) =>{
                if(response){
                    req.session.user = result;   
                    res.send({message: 'Logged In'});                                  
                }
                else{
                    res.send({message: "Wrong email/Password combination!"});
                }
               })
            }
            else{
                res.send({message: "User does not exist!"});
              
            }

                   
            
        }
        );
});

//3. Middleware
app.post('/auth', (req, res, next) =>{
    if(req.session && req.session.user){
        res.send({message: 'authenticated'});
        next();
    }
    else{
        res.send({message: 'Not authenticated'});
    }
    
});

//4. Logout

app.get('/logout', (req, res) =>{
    if(req.session){
        req.session.destroy(error =>{
            if(error){
                res.send("Log out error!");
            }
            else{
                res.send('Logged out');
            }
        })
    }
    else{
        res.send('Not logged in');
    }
})


//5. Check if user details exist

app.post('/checkUserDetails', (req, res) => {
    //id from userAccount table
    const userId = req.session.user[0].id;

        db.query("SELECT * FROM userDetails WHERE userId = ?;", 
        userId,
        (err, result) =>{
            if(err){
                console.log({err : err});
            }
            if(result.length > 0){
               res.send({message: "Client details present"});
            }
            else{
                res.send({message: "Client details are missing"});
              
            }

            
        }
        );
});


//6. user details
app.post('/userDetails', (req, res) => {    
        const phone = req.body.phone;
        const id_no = req.body.id_no;
        const dob = req.body.dob;
        const employment_status = req.body.employment_status;
        const userId = req.session.user[0].id;
        

        db.query("INSERT INTO userDetails (phone, id_no, dob, employment_status, userId) VALUES (?, ?, ?, ?, ?)", 
        [phone, id_no, dob, employment_status, userId], 
        (err, result) =>{
            if(err){
                console.log(err);
            }
            else{
                res.send({message: "Values Inserted"});
            }
        }
        );

});

//7. CheckSignature

app.post('/userSignature', (req, res) =>{
    const userId = req.session.user[0].id;

    db.query("SELECT * FROM pensiondetails WHERE userId = ?;", 
        userId,
        (err, result) =>{
            if(err){
                console.log({err : err});
            }
            if(result.length > 0){
               
               const userSignature = req.body.userSignature;

               db.query("UPDATE pensionDetails SET userSignature = ? WHERE userId = ?", 
                [userSignature, userId],
                (err, result) =>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        res.send({message: "signature inserted"});
                    }
                }
                );
            }
            else{
                res.send({message: "signature missing"});
              
            }
        }
        );  

})


//8. Add pensionDetails
app.post('/pensionDetails',  (req, res) => {    
    const EmployerName= req.body.companyName;
    const OrganizationEmail = req.body.companyEmail;
    const PensionProvider = req.body.provider;
    const AdditionalInformation = req.body.additionalInfo;
    const FundedByEmployer = req.body.isFundedByEmployer;
    const userId = req.session.user[0].id;
    const transferStatus = req.body.transferStatus;
    const transactionType = "Pension Transfer";


      //Inserting pension details to the pensionDetails table
      db.query("INSERT INTO pensiondetails (EmployerName, OrganizationEmail, PensionProvider, AdditionalInformation, FundedByEmployer, userId, transferStatus) VALUES (?, ?, ?, ?, ?, ?, ?)", 
      [EmployerName, OrganizationEmail, PensionProvider, AdditionalInformation, FundedByEmployer, userId, transferStatus], 
      (err, result) =>{
          if(err){
              console.log(err);
          }
          else{
              res.send({message: "Values Inserted"});
          }
      }
      );

    const userName = (req.session.user[0].name);

    //Inserting usercombinedpension
   db.query("INSERT INTO usercombinedpensions (userId, userName, provider, transactionType) VALUES (?, ?, ?, ?)", 
    [userId, userName, PensionProvider, transactionType], 
    (err, result) =>{
        if(err){
            console.log(err);
        }
        else{
           
        }
    }
    );

    //Inserting into transactions

   db.query("INSERT INTO transactions (PensionProvider, transferStatus, transactionType, userId) VALUES (?, ?, ?, ?)", 
   [PensionProvider, transferStatus, transactionType, userId], 
   (err, result) =>{
       if(err){
           console.log(err);
       }
       else{
          
       }
   }
   );

   //Getting user Id no and updating to transactions
   db.query("SELECT id_no  FROM userdetails WHERE userId = ?;", 
        userId,
        (err, result) =>{
            if(err){
                console.log({err : err});
            }
            if(result.length > 0){
               db.query("UPDATE transactions SET idNo = ? WHERE userId = ?", 
                [result[0].id_no, userId],
                (err, result) =>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        
                    }
                }
                );

                db.query("UPDATE pensiondetails SET idNo = ? WHERE userId = ?", 
                [result[0].id_no, userId],
                (err, result) =>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        
                    }
                }
                );
            }
            else{
                
              
            }
        }
        );  


});


//9. Get pension providers to send to confirm page for the user to confirm the providers

app.post('/pensionProvider', (req, res) => {
    //id from userAccount table
    const userId = req.session.user[0].id;
    const transferStatus = 0;

        db.query("SELECT PensionProvider AS providerName FROM pensiondetails WHERE userId = ? AND transferStatus = ?;", 
        [userId, transferStatus],
        (err, result) =>{
            if(err){
                console.log({err : err});
            }
            if(result.length > 0){
                req.session.provider = result;
               res.send({message: result});
            }
            else{
                res.send({message: "Providers are missing."});
              
            }

            
        }
        );
});

//10. UPDATE status

app.post('/queueTransfer', (req, res) => {
    //id from userAccount table
    const userId = req.session.user[0].id;
    const transferStatus = req.body.transferStatus;
    const providers = req.session.provider;

    db.query("UPDATE pensionDetails SET transferStatus = ? WHERE userId = ? AND transferStatus = \"0\"", 
    [transferStatus, userId],
    (err, result) =>{
        if(err){
            console.log(err);
        }
        else{
            for(var i=0; i<providers.length; i++){
                db.query("UPDATE transactions SET transferStatus = ? WHERE userId = ? AND transferStatus = 0 AND pensionProvider = ?", 
                [transferStatus, userId, providers[i].providerName],
                (err, result) =>{
                    if(err){
                        console.log(err);
                    }
                    else{
                       
                    }
                }
                );
            }
        }
    }
    );
});


// 11. Total Combined pensions
app.post('/totalCombined', (req, res) => {
    //id from userAccount table
    const userId = req.session.user[0].id;
    const transactionType = "Pension Transfer";

        db.query("SELECT SUM(amount) AS totalCombined FROM transactions WHERE userId = ? AND transactionType = ?;", 
        [userId, transactionType],
        (err, result) =>{
            if(err){
                console.log({err : err});
            }
            if(result.length > 0){
               res.send(result);
            }
            else{
                res.send({message: "Amount not found"});
            }
            
        }
        );
});

// 12. Get Total contributions
app.post('/totalContributions', (req, res) => {
    //id from userAccount table
    const userId = req.session.user[0].id;

        db.query("SELECT SUM(amount) AS totalContributed FROM usercontributions WHERE userId = ?", 
        [userId],
        (err, result) =>{
            if(err){
                console.log({err : err});
            }
            if(result.length > 0){
               res.send(result);
            }
            else{
                res.send({message: "Amount not found"});
              
            }

            
        }
        );
});

//13. Get transactions to populate graph

app.post('/transactions', (req, res) => {
    //id from userAccount table
    const userId = req.session.user[0].id;

        db.query("SELECT amount, DATE_FORMAT(time, '%Y-%m') AS timeStamp FROM transactions WHERE userId = ? AND transferStatus > 99 ORDER BY Time ASC;", 
        [userId],
        (err, result) =>{
            if(err){
                console.log({err : err});
            }
            if(result.length > 0){
               res.send(result);
            }
            else{
                res.send({message: "No transactions yet"});
              
            }

            
        }
        );
});

//14. get Pending pension transfers

app.post('/pendingTransfers', (req, res) => {
    //id from userAccount table
    const userId = req.session.user[0].id;

        db.query("SELECT PensionProvider, transferStatus FROM transactions WHERE userId = ? AND transferStatus < 100;", 
        [userId],
        (err, result) =>{
            if(err){
                console.log({err : err});
            }
            if(result.length > 0){
               res.send(result);
            }
            else{
                res.send({message: "No pension transfers"});
                
            }
        }
        );
});

//15. Get activity from database

app.post('/activity', (req, res) => {
    //id from userAccount table
    const userId = req.session.user[0].id;

        db.query("SELECT transactionType AS activity, Amount AS activityAmount FROM transactions WHERE userId = ? AND transferStatus > 99;", 
        [userId],
        (err, result) =>{
            if(err){
                console.log({err : err});
            }
            if(result.length > 0){
               res.send(result);
            }
            else{
                res.send({message: "No activity"});
              
            }

            
        }
        );
});

//15. Get profileDetails from database

app.post('/getProfile', (req, res) => {
    //id from userAccount table
    const userId = req.session.user[0].id;

        db.query("SELECT useraccount.id, useraccount.name, useraccount.email, userdetails.phone, userdetails.id_no, userdetails.dob, userdetails.employment_status FROM useraccount RIGHT JOIN userdetails ON useraccount.id = userdetails.userid WHERE useraccount.id = ? AND userdetails.userId = ?;", 
        [userId, userId],
        (err, result) =>{
            if(err){
                console.log({err : err});
            }
            if(result.length > 0){
               res.send(result);
            }
            else{
                res.send({message: "No Profile"});
              
            }

            
        }
        );
});

//16. -------------------Update Profile------------------------

//Update username

app.post('/updateUserName', (req, res) => {
    const userName = req.body.userName;
    const userId = req.session.user[0].id;

    db.query("UPDATE useraccount SET name = ? WHERE id = ?", 
                [userName, userId],
                (err, result) =>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        res.send("Name inserted successfully");
                    }
                }
                );
})

//Update userEmail

app.post('/updateUserEmail', (req, res) => {
    const userEmail = req.body.userEmail;
    const userId = req.session.user[0].id;

    db.query("UPDATE useraccount SET email = ? WHERE id = ?", 
                [userEmail, userId],
                (err, result) =>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        res.send("Email inserted successfully");
                    }
                }
                );
})

//Update userPhone

app.post('/updateUserPhone', (req, res) => {
    const userPhone = req.body.userPhone;
    const userId = req.session.user[0].id;

    db.query("UPDATE userdetails SET phone = ? WHERE userId = ?", 
                [userPhone, userId],
                (err, result) =>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        res.send("Phone inserted successfully");
                    }
                }
                );
})

//Update userId

app.post('/updateUserId', (req, res) => {
    const id = req.body.userID;
    const userId = req.session.user[0].id;

    db.query("UPDATE userdetails SET id_no = ? WHERE userId = ?", 
                [id, userId],
                (err, result) =>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        db.query("UPDATE pensiondetails SET idno = ? WHERE userId = ?", 
                        [id, userId],
                        (err, result) =>{
                            if(err){
                                console.log(err);
                            }
                            else{
                                db.query("UPDATE transactions SET idno = ? WHERE userId = ?", 
                                [id, userId],
                                (err, result) =>{
                                    if(err){
                                        console.log(err);
                                    }
                                    else{
                                        res.send("Id inserted successfully");
                                    }
                                }
                                );
                            }
                        }
                        );
                    }
                }
                );

})

//Update dob

app.post('/updateDOB', (req, res) => {
    const dob = req.body.dob;
    const userId = req.session.user[0].id;

    db.query("UPDATE userdetails SET dob = ? WHERE userId = ?", 
                [dob, userId],
                (err, result) =>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        res.send("dob inserted successfully");
                    }
                }
                );
})

//Update employment status

app.post('/updateEmploymentStatus', (req, res) => {
    const employmentStatus = req.body.employmentStatus;
    const userId = req.session.user[0].id;

    db.query("UPDATE userdetails SET employment_status = ? WHERE userId = ?", 
                [employmentStatus, userId],
                (err, result) =>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        res.send("Employment status inserted successfully");
                    }
                }
                );
})

//Benefiary details
app.post('/beneficiaryDetails', (req, res) => {
    const beneficiaryFirstName =  req.body.beneficiaryFirstName;
    const  beneficiaryLastName =  req.body.beneficiaryLastName;
    const  beneficiarydob = req.body.beneficiarydob;
    const benefit = req.body.benefit;
    const userId = req.session.user[0].id;

    db.query("INSERT INTO clientbeneficiary (firstname, lastname, dob, benefit, userId) VALUES (?, ?, ?, ?, ?);", 
    [beneficiaryFirstName, beneficiaryLastName, beneficiarydob, benefit, userId], 
    (err, result) =>{
        if(err){
            console.log(err);
        }
        else{
           res.send("Beneficiary added successfully");
        }
    }
    );
})

// Get beneficiaries

//Benefiary details
app.post('/beneficiaries', (req, res) => {
    const userId = req.session.user[0].id;

    db.query("SELECT firstname, lastname, benefit FROM clientbeneficiary WHERE userId = ?;", 
    [userId], 
    (err, result) =>{

        if(err){
            console.log(err);
        }
        if(result.length > 0){
            res.send(result);
        }
        else{
           res.send("No beneficiaries");
        }
    }
    );
})


//
//
//
//
//
//
//##########   Admin Section
//
//
//
//
//

//1. Get total accounts

app.post('/totalCases', (req, res) => {
    //id from adminAccount table
    //const userId = req.session.user[0].id;

        db.query("SELECT id AS cases FROM useraccount;", 
        (err, result) =>{
            if(err){
                console.log({err : err});
            }
            if(result){
               res.send(result);
            }
            else{
                res.send({message: "No cases"});
              
            }            
        }
        );
});

//2. Get total pending transfers

app.post('/totalPendingTransfers', (req, res) => {
    //id from adminAccount table
    //const userId = req.session.user[0].id;

        db.query("SELECT COUNT(*) AS totalPendingTransfers FROM transactions WHERE transferStatus < 100;", 
        (err, result) =>{
            if(err){
                console.log({err : err});
            }
            if(result){
               res.send(result);
            }
            else{
                res.send({message: "No Pending transfers"});
              
            }            
        }
        );
});

//Create admin account
app.post('/adminCreate', async(req, res) => {
    //Create account details
        const name = req.body.name;
        const email = req.body.email;
        const password = req.body.password;

        db.query("SELECT * FROM adminaccount WHERE email = ?;",
        email,
        (err, result)=>{
            if(err){
                console.log({err : err});
            }
            else if(result.length > 0){
                res.send("Another admin with that email already exists! If this is you, Try logging in");
            }
            else{
                bcrypt.hash(password, saltRounds, (err, hash) =>{

                    if(err){
                        console.log(err);
                    }
        
                    db.query("INSERT INTO adminaccount (adminName, email, password) VALUES (?, ?, ?);", 
                    [name, email, hash], 
                    (err, result) =>{
                        if(err){
                            console.log(err);
                        }
                        else{                          
                            res.send("Values Inserted");
                        }
                    }
                    );
                })
        
            }
        }
        )
    
});

//2. Admin Login

app.post('/adminLogin', (req, res) => {
    //login details
        const email = req.body.email;
        const password = req.body.password;

        db.query("SELECT * FROM adminaccount WHERE email = ?;", 
        email,
        (err, result) =>{
            if(err){
                console.log({err : err});
            }
            if(result.length > 0){
               bcrypt.compare(password, result[0].password, (error, response) =>{
                if(response){
                    req.session.admin = result;   
                    res.send({message: 'Logged In'});                 
                }
                else{
                    res.send({message: "Wrong email/Password combination!"});
                }
               })
            }
            else{
                res.send({message: "Administrator account does not exist!"});
              
            }

            
        }
        );
});

//3. Authenticate admin
app.post('/adminAuth', (req, res, next) =>{
    if(req.session && req.session.admin){

        res.send({message: 'authenticated'});
        next();
    }
    else{
        res.send({message: 'Not authenticated'});
    }
    
});

//4. Get number of cases and date of enrolment to populate graph

app.post('/getCases', (req, res) => {

    db.query("SELECT DATE_FORMAT(create_time, '%M') AS month, DATE_FORMAT(create_time, '%Y-%M') AS monthAndYear FROM useraccount WHERE create_time > (now()) - INTERVAL 12 MONTH",
    (err, result) =>{
     if(err){
         console.log({err : err});
     }
     if(result.length > 0){
         res.send(result);
     }
     else{
         res.send(result);
     }
    }
    )
        
 });

//5. Admin dashboard pending transfer table
app.post("/")

//6. get Pending pension transfers

app.post('/queuedTransfers', (req, res) => {
    

        db.query("SELECT DISTINCT useraccount.name, useraccount.email, userdetails.phone, userdetails.id_no, userdetails.employment_status, pensiondetails.EmployerName, pensiondetails.OrganizationEmail, pensiondetails.PensionProvider, pensiondetails.FundedByEmployer, transactions.transferStatus FROM useraccount RIGHT JOIN userdetails ON useraccount.id = userdetails.userId RIGHT JOIN pensiondetails ON userdetails.userId = pensiondetails.userId RIGHT JOIN transactions ON pensiondetails.userId = transactions.userId WHERE transactions.transferStatus < 100 AND transactions.transferStatus = pensiondetails.transferStatus;", 
    
        (err, result) =>{
            if(err){
                console.log({err : err});
            }
            if(result.length > 0){
               res.send(result);
            }
            else{
                res.send({message: "No pension transfers"});
                
            }
        }
        );
});

//7. Sending admin user name to dashboard
app.post('/adminName', (req, res) => {
        res.send(req.session.admin[0].adminName);
});


//8. Update of status and amount --- Done by the admin the dashboard
app.post('/statusUpdate', (req, res) => {
    //Update details
    const clientId = req.body.clientId;
    const pensionAmount = req.body.pensionAmount;
    const status = req.body.status;
    const clientEmployer = req.body.clientEmployer;
    const pensionProvider = req.body.pensionProvider;

    console.log(pensionProvider);

    db.query("UPDATE pensiondetails SET transferStatus = ? WHERE idNo = ? AND PensionProvider = ? AND employername = ?;", 
    [status, clientId, pensionProvider, clientEmployer], 
    (err, result) =>{
        if(err){
            console.log(err);
        }
        else{                          
            db.query("UPDATE transactions SET transferStatus = ?, Amount = ?  WHERE idNo = ? AND PensionProvider = ?;", 
            [status, pensionAmount, clientId, pensionProvider], 
            (err, result) =>{
                if(err){
                    
                }
                else{                       
                    res.send("Values Updated");
                }
            }
            ); 
            
        }
    }
    );

                    
})
       

  //10. get contributions

app.post('/contributionsTable', (req, res) => {
    

    db.query("SELECT DISTINCT useraccount.name, userdetails.id_no, userdetails.phone, transactions.amount FROM useraccount JOIN userdetails ON useraccount.id = userdetails.userId JOIN transactions ON userdetails.userId = transactions.userid WHERE transactions.transactionType = \"Contribution\";", 

    (err, result) =>{
        if(err){
            console.log({err : err});
        }
        if(result.length > 0){
           res.send(result);
        }
        else{
            res.send({message: "No contributions"});
            
        }
    }
    );
});       

       
//11. Get withdrawals

app.post('/withdrawTable', async(req, res) => {
    

    db.query("SELECT DISTINCT useraccount.name, userdetails.id_no, userdetails.phone, transactions.amount FROM useraccount JOIN userdetails ON useraccount.id = userdetails.userId JOIN transactions ON userdetails.userId = transactions.userid WHERE transactions.transactionType = \"Withdraw\";", 

    (err, result) =>{
        if(err){
            console.log({err : err});
        }
        if(result.length > 0){
           res.send(result);
        }
        else{
            res.send({message: "No Withdrawals"});
            
        }
    }
    );
});  

// 12. Search client 

app.post('/getClient', async(req, res) => {
    

    db.query("SELECT  useraccount.name, userdetails.id_no FROM useraccount LEFT JOIN userdetails ON useraccount.id = userdetails.userId;", 

    (err, result) =>{
        if(err){
            console.log({err : err});
        }
        if(result.length > 0){
           res.send(result);
        }
        else{
            res.send({message: "No Client"});
            
        }
    }
    );
}); 

//13. Get specific client details

app.post('/searchDetails', async(req, res) => {
   
    const idNumber = req.body.idNumber;
    let clientId;

    db.query("SELECT userId from userdetails WHERE id_no = ?",
    [idNumber],
    (err, result)=>{
        if(err){
            console.log({err : err});
        }
        if(result.length <= 0){
            res.send("No Profile");
        }
        else{
           clientId = result[0].userId;
           
           db.query("SELECT useraccount.name, useraccount.email, useraccount.create_time, userdetails.phone, userdetails.id_no, userdetails.dob, userdetails.employment_status FROM useraccount RIGHT JOIN userdetails ON useraccount.id = userdetails.userId WHERE useraccount.id = ?;", 
           [clientId],
           (err, result) =>{
               if(err){
                   console.log({err : err});
               }
               if(result.length > 0){
                  res.send(result);
               }
               else{
                   res.send("No Details");
               }
           }
           );
        }
    }
    )
 
});

// 14. Total Combined pensions
app.post('/clientProfileTotalCombined', (req, res) => {
    //id from userAccount table
    const idNumber = req.body.idNumber;
    let clientId;
    const transactionType = "Pension Transfer";

    db.query("SELECT userId from userdetails WHERE id_no = ?",
    [idNumber],
    (err, result)=>{
        if(err){
            console.log({err : err});
        }
        if(result.length <= 0){
            res.send("User not found!");
        }
        else{
           clientId = result[0].userId;
           
           db.query("SELECT SUM(amount) AS totalCombined FROM transactions WHERE userId = ? AND transactionType = ?;", 
           [clientId, transactionType],
           (err, result) =>{
               if(err){
                   console.log({err : err});
               }
               if(result.length > 0){
                  res.send(result);
               }
               else{
                   res.send({message: "Amount not found"});
               }
               
           }
           );
        }
    }
    )
});

// 15. Get Total contributions
app.post('/clientProfileTotalContributions', (req, res) => {
    //id from userAccount table
    const idNumber = req.body.idNumber;
    let clientId;

    db.query("SELECT userId from userdetails WHERE id_no = ?",
    [idNumber],
    (err, result)=>{
        if(err){
            console.log({err : err});
        }
        if(result.length <= 0){
            res.send("User not found!");
        }
        else{
           clientId = result[0].userId;
           
           db.query("SELECT SUM(amount) AS totalContributed FROM usercontributions WHERE userId = ?", 
        [clientId],
        (err, result) =>{
            if(err){
                console.log({err : err});
            }
            if(result.length > 0){
               res.send(result);
            }
            else{
                res.send({message: "Amount not found"});
              
            }

            
        }
        );
        }
    }
    )
});


//16. Get total combined and contributed amounts from transactions table to populate pie charts in the admin dashboard
app.post('/getPieData', (req, res) => {

    db.query("SELECT DATE_FORMAT(time, '%Y-%M') AS monthAndYear, amount FROM transactions WHERE time > (now()) - INTERVAL 12 MONTH AND transactiontype = \"Pension Transfer\" AND amount > 0",
    (err, result) =>{
        if(err){
            console.log({err : err});
        }
        if(result.length > 0){
            
            var combineMonthAndYear = result;

            db.query("SELECT SUM(amount) AS totalCombined FROM transactions WHERE time > (now()) - INTERVAL 12 MONTH AND transactiontype = \"Pension Transfer\" AND amount > 0",
            (err, result) =>{
                if(err){
                    console.log({err : err});
                }
                if(result.length > 0){  
                    var combinedCumulative = result; 

                    db.query("SELECT DATE_FORMAT(time, '%Y-%M') AS monthAndYear, amount FROM transactions WHERE time > (now()) - INTERVAL 12 MONTH AND transactiontype = \"contribution\" AND amount > 0",
                    (err, result) =>{
                        if(err){
                            console.log({err : err});
                        }
                        if(result.length >= 0){  
                            var contributeMonthAndYear = result;

                            db.query("SELECT SUM(amount) AS totalContributed FROM transactions WHERE time > (now()) - INTERVAL 12 MONTH AND transactiontype = \"contribution\" AND amount > 0",
                            (err, result) =>{
                                if(err){
                                    console.log({err : err});
                                }
                                if(result.length >= 0){  
                
                                    var contributedCumulative = result;
                                    res.json({combineMonthAndYear, combinedCumulative, contributeMonthAndYear, contributedCumulative});
                                }
                            }
                            );
                        }
                    }
                    );
                }
            }
            );
        }
        else{
            res.send("No combined pensions");
        }
    }
    )
        
 });

 //17. Get client signature

app.post('/getSig', async(req, res) => {
    const clientId = req.body.clientId;
    const pensionProvider = req.body.pensionProvider;
    const clientEmployer = req.body.clientEmployer;

    db.query("SELECT  userSignature FROM pensiondetails WHERE idNo = ? AND pensionprovider = ? AND employername = ?;", 
    [clientId, pensionProvider, clientEmployer],
    (err, result) =>{
        if(err){
            console.log({err : err});
        }
        if(result.length > 0){
           res.send(result);
        }
        else{
            res.send({message: "No Signature"});
            
        }
    }
    );
}); 


app.listen(5000, ()=>{
    console.log("Server is running on port 5000");
});
