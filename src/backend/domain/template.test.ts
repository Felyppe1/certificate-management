// import { describe, expect, it } from 'vitest'
// import { Template, TEMPLATE_TYPE } from './template'
// import { ValidationError } from './error/validation-error'

// describe('Template', () => {
//     it('should create a template successfully only with necessary data', () => {
//         expect(
//             () =>
//                 new Template({
//                     id: '1',
//                     fileId: '1',
//                     variables: [],
//                     bucketUrl: null,
//                     fileName: 'File Name',
//                     type: TEMPLATE_TYPE.URL,
//                 }),
//         ).not.toThrow()
//     })

//     it('should not add a bucket URL if the type is not UPLOAD', () => {
//         expect(
//             () =>
//                 new Template({
//                     id: '1',
//                     fileId: '1',
//                     variables: [],
//                     bucketUrl: 'http://bucket-url',
//                     fileName: 'File Name',
//                     type: TEMPLATE_TYPE.URL,
//                 }),
//         ).toThrow(ValidationError)
//     })

//     it('should not add a file ID if the type is UPLOAD', () => {
//         expect(
//             () =>
//                 new Template({
//                     id: '1',
//                     fileId: '1',
//                     variables: [],
//                     bucketUrl: 'http://bucket-url',
//                     fileName: 'File Name',
//                     type: TEMPLATE_TYPE.UPLOAD,
//                 }),
//         ).toThrow(ValidationError)
//     })

//     it('should throw validation error when required data is missing', () => {
//         expect(
//             () =>
//                 new Template({
//                     id: '',
//                     fileId: '1',
//                     variables: [],
//                     bucketUrl: 'http://bucket-url',
//                     fileName: 'File Name',
//                     type: TEMPLATE_TYPE.URL,
//                 }),
//         ).toThrow('Template ID is required')
//     })
// })
