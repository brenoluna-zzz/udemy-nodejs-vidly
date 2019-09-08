const request = require('supertest'); //use supertest to send requests to endpoints
const {Genre} = require('../../../models/genre');
const mongoose = require('mongoose');
const {User} = require('../../../models/user');

let server;// To load the server into from index

describe('/api/genres', () => {
    // Utility functions to open and close the server after each test script
    beforeEach(() => { server = require('../../../index'); });
    afterEach(async () => {
        await Genre.remove({}); //clean up the db for the endpoint
        server.close();
    });

    describe('GET /', () => {
        it('should return all genres', async () => {
            await Genre.collection.insertMany([
                { name: 'genre1' },
                { name: 'genre2' }
            ]);


            const res = await request(server).get('/api/genres');
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
            expect(res.body.some(g => g.name === 'genre1')).toBeTruthy();
            expect(res.body.some(g => g.name === 'genre2')).toBeTruthy();
        });
    });

    describe('GET /:id', () => {
        it('should return status 200 and a genre object when the ID exists in the DB', async () => {
            // Create single genre and save to DB
            const genre = new Genre({ name: 'genre1' });
            await genre.save();

            const res = await request(server).get('/api/genres/' + genre._id);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('name', genre.name); // Can't use .toMatchObject() since id types won't match
        });

        it('should return status 404 error when the ID does not exist in the DB', async () => {
            const id = new mongoose.Types.ObjectId().toHexString();

            const res = await request(server).get(`/api/genres/${id}`);
            expect(res.status).toBe(404);
        });
    });

    describe('POST /', () => {

        // In this method by the author, the "happy path" is defined as a separate
        // function to be altered as needed in each test script of the suite, using
        // local variables. Parameters can be used but is discouraged due to
        // its "old and procedural way of programming".
        let token;
        let name;
        const exec = async () => {
            return await request(server)
                .post('/api/genres')
                .set('x-auth-token', token)
                .send({ name });
        }

        beforeEach(() => {
            token = new User().generateAuthToken();
            name = 'genre1';
        });

        it('should return 401 if the user is not logged in', async () => {
            token = '';
            const res = await exec();

            expect(res.status).toBe(401);
        });

        it('should return 400 if genre\'s name is less than 3 charactes', async () => {
            name = 'ge';
            const res = await exec();

            expect(res.status).toBe(400);
        });

        it('should return 400 if genre\'s name is less than 50 charactes', async () => {
            name = new Array(52).join('a'); //Gives a sequence of 51 'a'

            const res = await exec();

            expect(res.status).toBe(400);
        });

        it('should save the genre in the db if it is valid', async () => {
            await exec();

            const genre = await Genre.find({ name });
            expect(genre).not.toBeNull();
        });

        it('should return the genre object to the client', async () => {
            const res = await exec();

            expect(res.body).toHaveProperty('_id');
            expect(res.body).toHaveProperty('name', 'genre1');
        });
    });

    describe('PUT /:id', () => {
        let token;
        let name;
        let _id;
        const exec = async () => {
            return await request(server)
                .put(`/api/genres/${_id}`)
                .set('x-auth-token', token)
                .send({ name });
        }

        beforeEach(async () => {
            token = new User().generateAuthToken();
            name = 'genre new';
            const req = await request(server)
                .post('/api/genres')
                .set('x-auth-token', token)
                .send({ name: 'genre old' });
            _id = req.body._id;
        });

        it('should return 401 if the user is not logged in', async () => {
            token = '';
            const res = await exec();

            expect(res.status).toBe(401);
        });

        it('should return 400 if genre\'s name is less than 3 charactes', async () => {
            name = 'ge';
            const res = await exec();

            expect(res.status).toBe(400);
        });

        it('should return 400 if genre\'s name is less than 50 charactes', async () => {
            name = new Array(52).join('a'); //Gives a sequence of 51 'a'

            const res = await exec();

            expect(res.status).toBe(400);
        });

        it('should return 404 if genre\'s _id is not in the db', async () => {
            _id = mongoose.Types.ObjectId().toHexString(); //set id to value not present in the db

            const res = await exec();

            expect(res.status).toBe(404);
        });

        it('should update the genre in the db if _id is valid', async () => {
            await exec();

            const genre = await Genre.findById(_id); // find in db
            console.log(genre);
            expect(genre).not.toBeNull();
            expect(genre._id).toEqual(mongoose.Types.ObjectId(_id));
        });

        it('should return the updated genre object to the client', async () => {
            const res = await exec();

            expect(res.body).toHaveProperty('_id', _id);
            expect(res.body).toHaveProperty('name', name);
        });
    });

    describe('DELETE /:id', () => {
        let token;
        let _id;
        const exec = async () => {
            return await request(server)
                .delete(`/api/genres/${_id}`)
                .set('x-auth-token', token);
        }

        beforeEach(async () => {
            token = new User({ isAdmin: true }).generateAuthToken();
            const req = await request(server)
                .post('/api/genres')
                .set('x-auth-token', token)
                .send({ name: 'genre1' });
            _id = req.body._id;
        });

        it('should return 401 if the user is not logged in', async () => {
            token = '';
            const res = await exec();

            expect(res.status).toBe(401);
        });

        it('should return 403 if the user is not an admin', async () => {
            token = new User({ isAdmin: false }).generateAuthToken();
            const res = await exec();

            expect(res.status).toBe(403);
        });

        it('should return 404 if genre\'s _id is not in the db', async () => {
            _id = mongoose.Types.ObjectId().toHexString(); //set id to value not present in the db

            const res = await exec();

            expect(res.status).toBe(404);
        })

        it('should remove the genre from the db if the _id is valid', async () => {
            await exec();

            const res = await Genre.findById(_id);

            expect(res).toBeNull();
        })
    });
});