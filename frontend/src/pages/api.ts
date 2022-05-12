import { request } from 'umi';

export async function getData() {
  return request('/api/data', {
    method: 'GET'
  });
}