const _ = require('lodash')

const dummy = () => {
  return 1
}

const totalLikes = (blogs) => {
  return blogs.reduce((acc, curr) => acc + curr.likes, 0)
}

const favoriteBlog = (blogs) => {
  if (blogs.length === 0) return null

  return blogs.reduce((prev, curr) => (prev.likes >= curr.likes ? prev : curr))
}

// const mostBlogs = (blogs) => {
//   if (blogs.length === 0) return null

//   const authorCounts = blogs.reduce((counts, blog) => {
//     counts[blog.author] = (counts[blog.author] || 0) + 1
//     return counts
//   }, {})

//   const topAuthor = Object.keys(authorCounts).reduce((a, b) =>
//     authorCounts[a] > authorCounts[b] ? a : b
//   )

//   return {
//     author: topAuthor,
//     blogs: authorCounts[topAuthor]
//   }
// }

const mostBlogs = (blogs) => {
  if (blogs.length === 0) return null

  const counts = _.countBy(blogs, 'author')

  const countArray = _.map(counts, (val, key) => ({
    author: key,
    blogs: val,
  }))

  return _.maxBy(countArray, 'blogs')
}

const mostLikes = (blogs) => {
  if (blogs.length === 0) return null

  return _.chain(blogs)
    .groupBy('author')
    .map((authorBlogs, authorName) => ({
      author: authorName,
      likes: _.sumBy(authorBlogs, 'likes')
    }))
    .maxBy('likes')
    .value()
}

// const mostLikes = (blogs) => {
//   if (blogs.length === 0) return null

//   // 1. Accumulate total likes per author
//   const authorLikes = blogs.reduce((likesMap, blog) => {
//     likesMap[blog.author] = (likesMap[blog.author] || 0) + blog.likes
//     return likesMap
//   }, {})

//   // 2. Find the author with the highest total likes
//   const topAuthor = Object.keys(authorLikes).reduce((a, b) =>
//     authorLikes[a] > authorLikes[b] ? a : b
//   )

//   return {
//     author: topAuthor,
//     likes: authorLikes[topAuthor]
//   }
// }

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog,
  mostBlogs,
  mostLikes,
}