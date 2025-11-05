import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class JsonResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();
    
    // Set JSON content type header
    response.setHeader('Content-Type', 'application/json');

    return next.handle().pipe(
      map((data) => {
        // Ensure response is always JSON
        return data;
      }),
    );
  }
}

