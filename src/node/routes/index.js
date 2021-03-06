const express = require('express'),
  router = express.Router(),
  Movies = require('../schemas/Movies'),
  Comments = require('../schemas/Comments'),
  escape = require('escape-regexp'),
  request = require('request');


/* GET REQUEST */
router.get('/', function (req, res) {
  Movies.find({}).exec((err, movies) => {
    if (err) {
      res.status(400).send(err);
    } else {
      res.status(200).send(movies);
    }
  });
});

router.get('/search-query', (req, res) => {
  Movies.find({title: {$regex: new RegExp(escape(req.query.name)), '$options': 'i'}}).exec((err, movies) => {
    if (err) {
      res.status(400).send(err);
    } else {
      res.status(200).send(movies);
    }
  })
});

router.get('/get-movie', (req, res) => {
  Movies.findById(req.query.id).populate('comments').exec((err, movie) => {
    if (err) {
      res.status(400).send(err);
    } else {
      console.log(movie);
      res.status(200).send(movie);
    }
  })
});

router.get('/get-comments', (req, res) => {
  Comments.find({}).populate('movie').exec((err, comments) => {
    if (err) {
      res.status(400).send(err);
    } else {
      console.log(comments);
      res.status(200).send(comments);
    }
  })
});

/* POST REQUEST */

router.post('/add-movie', (req, res) => {
  const formData = req.body.formData;
  request({
    url: `http://www.omdbapi.com/?apikey=1e9e7bae&t='${formData.title}&y=${formData.year}&type=${formData.type}`,
    json: true
  }, function (error, response, body) {
    if (error) {
      res.status(400).send(error);
    } else {
      if (!body.Error && body.Response === 'True') {
        Movies.create({
          title: body.Title,
          year: body.Year,
          rated: body.Rated,
          released: (body.Released === "NaN" || body.Released === 'N/A') ? new Date(1990, 0, 0) : body.Released,
          runtime: body.Runtime,
          genre: (body.Genre).split(','),
          director: body.Director,
          writer: (body.Writer).split(','),
          actors: (body.Actors).split(','),
          plot: body.Plot,
          language: (body.Language).split(','),
          country: (body.Country).split(','),
          awards: body.Awards,
          poster: body.Poster,
          ratings: [...body.Ratings],
          metascore: body.Metascore,
          imdbRating: Number((body.Released === "NaN" || body.Released === 'N/A') ? 0 : body.imdbRating),
          imdbID: body.imdbID,
          type: body.Type,
          totalSeasons: body.totalSeasons
        }, (err, movie) => {
          if (err) {
            res.status(400).send(err);
          }
          res.status(200).send(movie);
        })
      } else {
        res.status(404).send(body.Error);
      }
    }
  });
});

router.post('/add-comment', (req, res) => {
  Movies.findById(req.body.movieId, (err, movieItem) => {
    if (err) {
      res.status(200).send(err);
    } else {
      Comments.create({text: req.body.comment}, (err, comment) => {
        if (err) {
          res.status(400).send(err);
        } else {
          movieItem.comments.push(comment);
          movieItem.save();
          comment.author = {userId: req.body.userId, username: req.body.userId.username};
          comment.movie = movieItem;
          comment.save();
          res.status(200).send(comment);
        }
      });
    }
  })
});

/* DELETE ROUTES */

router.delete('/delete-movie', (req, res) => {
  Movies.findByIdAndRemove(req.query.movieId, (err, movie) => {
    if (err) {
      res.status(400).send(err);
    } else {
      Comments.deleteMany({_id: {$in: movie.comments}}, (err) => {
        if (err) {
          res.status(400).send(err);
        } else {
          res.status(200).send({success: true})
        }
      });
    }
  });
});

router.delete('/delete-comment', (req, res) => {
  Comments.findByIdAndRemove(req.query.commentId, (err) => {
    if (err) {
      res.status(400).send(err);
    } else {
      Movies.findById(req.query.movieId, (err, movie) => {
        if (err) {
          res.status(400).send(err);
        } else {
          movie.comments.pull(req.query.movieId);
          movie.save();
          res.status(200).send(movie);
        }
      })
    }
  })
});

module.exports = router;
