const express = require('express');
const router = express.Router();
const fauth = require('../libs/firebase').fauth;
const fdb = require('../libs/firebase').fdb;
const passport = require('passport');
const googleConf = require('../google/google.json').web
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
})

passport.use(
    "google_sign_in",
    new GoogleStrategy(
        {
            clientID: googleConf.client_id,
            clientSecret: googleConf.client_secret,
            callbackURL: googleConf.redirect_uris[0],
            passReqToCallback: true
        },
        function (request, accessToken, refreshToken, profile, done) {
            return done(null, profile);
        }
    )
);

passport.use(
    "google_sign_up",
    new GoogleStrategy(
        {
            clientID: googleConf.client_id,
            clientSecret: googleConf.client_secret,
            callbackURL: googleConf.redirect_uris[1],
            scope: ["email", "profile"],
            passReqToCallback: true
        },
        function (request, accessToken, refreshToken, profile, done) {
            return done(null, profile);
        }
    )
);

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

// google auth

router.get(
    "/google_sign_in",
    passport.authenticate("google_sign_in", { scope: ["profile", "email"] }, () => { })
)

router.get(
    "/google_sign_in/index",
    passport.authenticate("google_sign_in", { failureRedirect: "/?status=0" }),
    async function (req, res) {
        const google_id = req.user.id;
        let documentFound = false;

        try {
            await fdb.collection("users").where('google_id', '==', google_id).get().then((users) => {
                if (!users.empty) {
                    users.forEach(user => {
                        if (user.exists) {
                            documentFound = true;
                            req.session.isAuth = true;
                            req.session.first_name = user.data().first_name;
                            res.redirect('/');
                        }
                    })
                }
            })

            if (!documentFound) {
                res.redirect('/?status=0'); 
            }
        } catch (e) {
            console.log(e);
            return res.redirect('/?status=0');
        }
    }
);

router.get(
    "/google_sign_up",
    passport.authenticate("google_sign_up", { scope: ["profile", "email"] }, () => { })
)

router.get(
    "/google_sign_up/index",
    passport.authenticate("google_sign_up", { failureRedirect: "/?status=1" }),
    async function (req, res) {
        const google_id = req.user.id;
        const email = req.user.emails[0].value;
        const first_name = req.user.name.givenName;

        try {
            await fauth.createUserWithEmailAndPassword(fauth.getAuth(), email, "google5a9c8f4e2").then(async (userCredential) => {
                const user_id = userCredential.user.uid;

                await fdb.collection('users').doc(user_id).set({
                    user_id: user_id,
                    google_id: google_id,
                    email: email,
                    first_name: first_name,
                    last_name: null
                })

                req.session.isAuth = true;
                req.session.first_name = first_name;
                return res.redirect('/');
            })
        } catch (e) {
            console.log(e);
            if (e.code == 'auth/email-already-in-use') {
                return res.redirect('/?status=2')
            }
        }
    }
)
// google auth end

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