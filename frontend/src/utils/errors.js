export function apiMessage(error,fallback="Something went wrong. Please try again later."){
  if(!error.response)return "Unable to connect to server";
  if(error.response.status===401)return "Please login again";
  return error.response.data?.message||error.response.data?.error?.message||fallback;
}
export const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const validPassword=value=>/^[A-Za-z0-9]{6,72}$/.test(value);
