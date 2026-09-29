import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CLAVE_TOKEN } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(CLAVE_TOKEN);
  // Solo agrega el token a peticiones hacia NUESTRA API, nunca a otros dominios
  if (!token || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
