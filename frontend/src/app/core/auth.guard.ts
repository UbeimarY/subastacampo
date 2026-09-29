import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

/** Solo deja pasar a usuarios con sesión iniciada. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.autenticado() ? true : inject(Router).createUrlTree(['/login']);
};

/** Solo deja pasar a visitantes sin sesión (login y registro). */
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.autenticado() ? inject(Router).createUrlTree(['/']) : true;
};

/** Solo deja pasar a productores. */
export const productorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const usuario = auth.usuario();

  if (usuario) {
    return usuario.rol === 'productor' ? true : router.createUrlTree(['/']);
  }
  if (!auth.autenticado()) {
    return router.createUrlTree(['/login']);
  }
  // Recién se recargó la página: el token existe pero el usuario aún no se ha cargado
  return auth.cargarUsuario().pipe(
    map((u) => (u.rol === 'productor' ? true : router.createUrlTree(['/']))),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
