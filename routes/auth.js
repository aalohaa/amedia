const express = require('express');
const router = express.Router();
const fauth = require('../libs/firebase').fauth;
const fdb = require('../libs/firebase').fdb;

router.post('/sign-up', async (req, res) => {
    var r = { r: 0 };
    let first_name = req.body.first_name.trim();
    let last_name = req.body.last_name.trim();
    let email = req.body.email.toLowerCase().trim();
    let password = req.body.password.trim();

    if (!email && !password || !first_name || !last_name) {
        res.send(r);
        return;
    }

    try {
        await fauth.createUserWithEmailAndPassword(fauth.getAuth(), email, password).then(async (userCredential) => {
            await fdb.collection('users').doc(userCredential.user.uid).set({
                user_id: userCredential.user.uid,
                first_name: first_name,
                last_name: last_name,
                email: email
            }).then(() => {
                r['r'] = 1;
                req.session.first_name = first_name;
                req.session.isAuth = true;
                res.send(r);
            })
        });
    }
    catch (e) {
        console.log(e);
        if (e.code == 'auth/too-many-requests') {
            r['r'] = 2
        }
        else if (e.code == 'auth/email-already-in-use') {
            r['r'] = 3;
        }
        res.send(r);
    }
});


router.post('/sign-in', async (req, res) => {
    var r = { r: 0 };
    let email = req.body.email.toLowerCase().trim();
    let password = req.body.password.trim();


    try {
        await fauth.signInWithEmailAndPassword(fauth.getAuth(), email, password).then(async (userCredential) => {
            await fdb.collection('users').doc(userCredential.user.uid).get().then((userDoc) => {
                r['r'] = 1;
                req.session.first_name = userDoc.data().first_name;
                req.session.isAuth = true;
                res.send(r);
            })
        })
    } catch (e) {
        console.log(e);
        if (e.code == 'auth/too-many-requests') {
            r['r'] = 2
        }
        res.send(r);
    }
})

router.post('/reset-password', async (req, res) => {
    var r = { r: 0 };
    let email = req.body.email.toLowerCase().trim();

    try {
        await fauth.sendPasswordResetEmail(fauth.getAuth(), email).then(() => {
            r['r'] = 1;
            res.send(r);
        })
    } catch (e) {
        console.log(e);
        res.send(r);
    }
})

router.get('/logout', (req, res) => {
    req.session.destroy();
    return res.redirect('/')
})

module.exports = router