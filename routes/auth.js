const express = require('express');
const router = express.Router();
const fauth = require('../fdb/firebase').fauth;
const fdb = require('../fdb/firebase').fdb;

router.post('/sign-up', async (req, res) => {
    var r = {r:0};
    let first_name = req.body.first_name;
    let last_name = req.body.last_name;
    let email = req.body.email.toLowerCase().trim();
    let password = req.body.password

    if(!email && !password) {
        res.send(r);
        return;
    }

    await fauth.createUserWithEmailAndPassword(fauth.getAuth(), email, password).then(async (userCredential) => {
        await fdb.collection('users').doc(userCredential.user.uid).set({
            user_id: userCredential.user.uid,
            first_name: first_name,
            last_name: last_name,
            email: email
        }).then(() => {
            r['r'] = 1;
            res.send(r);
        }).catch((e) => {
            console.log(e);
            res.send(r);
        })
    })
    
})

router.post('/sign-in', async (req, res) => {
    var r = {r:0};
    let email = req.body.email.toLowerCase().trim();
    let password = req.body.password;

    await fauth.signInWithEmailAndPassword(fauth.getAuth(), email, password).then(async(userCredential) =>{
        await fdb.collection('users').doc(userCredential.user.uid).get().then(()=> {
            r['r'] = 1;
            res.send(r);
        })
    }).catch((e)=>{
        console.log(e);
        res.send(r);
    })
})

module.exports = router