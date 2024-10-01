export const fetchAdapter: IFetchAdapter = (url, options) => {
  return fetch(url, options);
};

interface IFetchAdapter {
  (url: string, options?: RequestInit): Promise<Response>;
}
