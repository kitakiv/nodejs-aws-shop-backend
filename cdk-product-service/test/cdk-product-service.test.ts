import { handler as getProductsList } from '../lambda/products';
import { handler as getProductById } from '../lambda/productsById';

// describe('Products API Tests', () => {
//   describe('GET /products', () => {
//     test('should return all products', async () => {
//       const event = {
//         httpMethod: 'GET',
//         path: '/products'
//       };

//       const response = await getProductsList();

//       expect(response.statusCode).toBe(200);
//       const body = JSON.parse(response.body);
//       const data = body;
//       expect(Array.isArray(data)).toBe(true);
//       expect(data[0]).toHaveProperty('id');
//       expect(data[0]).toHaveProperty('title');
//       expect(data[0]).toHaveProperty('price');
//       expect(data[0]).toHaveProperty('description');
//     });
//   });

//   describe('GET /products/{id}', () => {
//     test('should return product by id', async () => {
//         const id = "7567ec4b-b10c-48c5-9345-fc73c48a80aa"
//       const event = {
//         httpMethod: 'GET',
//         path: `products/${id}`,
//         pathParameters: {
//           id
//         }
//       };

//       const response = await getProductById(event);

//       expect(response.statusCode).toBe(200);
//       const body = JSON.parse(response.body);
//       const data = body;
//       expect(data).toHaveProperty('id', id);
//       expect(data).toHaveProperty('description');
//       expect(data).toHaveProperty('title');
//       expect(data).toHaveProperty('price');
//       expect(data).toHaveProperty('count');
//     });
//     test('should return 404 for non-existent product', async () => {
//       const event = {
//         httpMethod: 'GET',
//         path: '/products/999',
//         pathParameters: {
//           id: '999'
//         }
//       };

//       const response = await getProductById(event);

//       expect(response.statusCode).toBe(404);
//       const body = JSON.parse(response.body);
//       expect(body).toHaveProperty('message', 'Product with id: 999 not found');
//     });
//   });
// });
