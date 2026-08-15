import { describe, expect, it } from 'vitest'
import { orderGenres } from './order-genres'

const ROCK = ['rock', 'classic rock', 'hard rock', 'garage rock']

describe('orderGenres', () => {
  it('leaves a pair alone when the leader already belongs to the bucket', () => {
    expect(orderGenres(['rock', 'indie'], ROCK)).toEqual(['rock', 'indie'])
  })

  it('moves the matched genre to the front when it is not already there', () => {
    expect(orderGenres(['indie', 'rock'], ROCK)).toEqual(['rock', 'indie'])
  })

  // The whole safety property of bucketMembersFor: no membership set means no
  // reorder, never a wrong one.
  it('does not reorder when there is no membership set', () => {
    expect(orderGenres(['indie', 'rock'], null)).toEqual(['indie', 'rock'])
  })

  it('leaves a pair alone when neither genre belongs to the bucket', () => {
    expect(orderGenres(['indie', 'folk'], ROCK)).toEqual(['indie', 'folk'])
  })

  it('matches by membership rather than equality', () => {
    expect(orderGenres(['indie', 'garage rock'], ROCK)).toEqual([
      'garage rock',
      'indie',
    ])
  })

  // LLM drift produced case variants in prod, and the bucket source lists some
  // sub-genres in both cases for exactly that reason.
  it('matches regardless of case or surrounding whitespace', () => {
    expect(orderGenres(['indie', ' Garage Rock '], ROCK)).toEqual([
      ' Garage Rock ',
      'indie',
    ])
  })

  it('caps at two genres', () => {
    expect(orderGenres(['indie', 'folk', 'rock'], null)).toEqual([
      'indie',
      'folk',
    ])
  })

  // The match is why the row is in the filtered list at all, so it leads even
  // when it sits past the cap in the unordered array.
  it('promotes a matched genre from past the cap', () => {
    expect(orderGenres(['indie', 'folk', 'rock'], ROCK)).toEqual([
      'rock',
      'indie',
    ])
  })

  it('handles a single genre and an empty array', () => {
    expect(orderGenres(['indie'], ROCK)).toEqual(['indie'])
    expect(orderGenres([], ROCK)).toEqual([])
  })
})
