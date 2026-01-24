import { APIGatewayProxyEventV2, APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { ZodError } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { ApplicationError } from '@application/errors/application/ApplicationError';
import { ErrorCode } from '@application/errors/ErrorCode';
import { HttpError } from '@application/errors/http/HttpError';
import { Registry } from '@kernel/di/Registry';
import { lambdaBodyParser } from '@main/utils/lambdaBodyParser';
import { lambdaErrorResponse } from '@main/utils/lambdaErrorResponse';
import { Constructor } from '@shared/types/Constructor';

type Event = APIGatewayProxyEventV2 | APIGatewayProxyEventV2WithJWTAuthorizer;

export function lambdaHttpAdapter(controllerImpl: Constructor<Controller<any, unknown>>) {
  return async (event: Event): Promise<APIGatewayProxyResultV2> => {
    try {
      const controller = Registry.getInstance().resolve(controllerImpl);

      const body = lambdaBodyParser(event.body);
      const params = event.pathParameters ?? {};
      const queryParams = event.queryStringParameters ?? {};
      const accountId = (
        'authorizer' in event.requestContext
          ? event.requestContext.authorizer.jwt.claims.internalId as string
          : null
      );

      const response = await controller.execute({
        body,
        params,
        queryParams,
        accountId,
      });

      return {
        statusCode: response.statusCode,
        body: response.body ? JSON.stringify(response.body) : undefined,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        return lambdaErrorResponse({
          statusCode: 400,
          code: ErrorCode.VALIDATION,
          message: error.issues.map(issue => ({
            field: issue.path.join('.'),
            error: issue.message,
          })),
        });
      }

      if (error instanceof HttpError) {
        return lambdaErrorResponse(error);
      }

      if (error instanceof ApplicationError) {
        return lambdaErrorResponse({
          statusCode: error.statusCode ?? 400,
          code: error.code,
          message: error.message,
        });
      }

      // eslint-disable-next-line no-console
      console.log(error);

      return lambdaErrorResponse({
        statusCode: 500,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Internal server error.',
      });
    }
  };
}

// import { Controller } from "@application/contracts/Controller";
// import { ApplicationError } from "@application/errors/application/ApplicationError";
// import { ErrorCode } from "@application/errors/ErrorCode";
// import { HttpError } from "@application/errors/http/HttpError";
// import { lambdaBodyParser } from "@main/utils/lambdaBodyParser";
// import { lambdaErrorResponse } from "@main/utils/lambdaErrorResponse";
// import { APIGatewayProxyEventV2, APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
// import { ZodError } from "zod";

// type Event = APIGatewayProxyEventV2 | APIGatewayProxyEventV2WithJWTAuthorizer;

// export function lambdaHttpAdapter(controller: Controller<any, unknown>) {
//   return async (event: Event): Promise<APIGatewayProxyResultV2> => {
//     try {
//       console.log('Received event:', JSON.stringify(event, null, 2));

//       const body = lambdaBodyParser(event.body);
//       const params = event.pathParameters ?? {};
//       const queryParams = event.queryStringParameters ?? {};
//       const accountId = (
//         'authorizer' in event.requestContext
//           ? event.requestContext.authorizer.jwt.claims.internalId as string
//           : null
//       );

//       console.log('Parsed body:', JSON.stringify(body, null, 2));
//       console.log('Params:', params);
//       console.log('Query params:', queryParams);

//       const response = await controller.execute({
//         body,
//         params,
//         queryParams,
//         accountId,
//       });

//       console.log('Controller response:', JSON.stringify(response, null, 2));

//       return {
//         statusCode: response.statusCode,
//         body: response.body ? JSON.stringify(response.body) : undefined,
//       }
//     } catch (error) {
//       console.error('Error details:', error);
//       console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');

//       if(error instanceof ZodError) {
//         console.error('ZodError details:', error.issues);
//         return lambdaErrorResponse({
//           statusCode: 400,
//           code: ErrorCode.VALIDATION,
//           message: error.issues.map(issue => ({
//             field: issue.path.join('.'),
//             message: issue.message
//           }))
//         })
//       };

//       if (error instanceof HttpError) {
//         console.error('HttpError details:', error);
//         return lambdaErrorResponse(error)
//       }

//       if(error instanceof ApplicationError) {
//         console.error('ApplicationError details:', error.message);
//         return lambdaErrorResponse({
//           statusCode: error.statusCode ?? 400,
//           code: error.code,
//           message: error.message,
//         })
//       }

//       // Adicionar log para outros tipos de erro
//       console.error('Unexpected error type:', typeof error);
//       console.error('Unexpected error constructor:', error?.constructor?.name);

//       return lambdaErrorResponse({
//         statusCode: 500,
//         code: ErrorCode.INTERNAL_SERVER_ERROR,
//         message: `internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
//       })
//     }
//   };
// }

// // export function lambdaHttpAdapter(controller: Controller<unknown>) {
// //   return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
// //     try {
// //       const body = lambdaBodyParser(event.body);
// //       const params = event.pathParameters ?? {};
// //       const queryParams = event.queryStringParameters ?? {};

// //       const response = await controller.execute({
// //         body,
// //         params,
// //         queryParams,
// //       });

// //       return {
// //         statusCode: response.statusCode,
// //         body: response.body ? JSON.stringify(response.body) : undefined,
// //       }
// //     } catch (error) {
// //       if(error instanceof ZodError) {
// //         return lambdaErrorResponse({
// //           statusCode: 400,
// //           code: ErrorCode.VALIDATION,
// //           message: error.issues.map(issue => ({
// //             field: issue.path.join('.'),
// //             message: issue.message
// //           }))
// //         })
// //       };
// //       if (error instanceof HttpError) {
// //         return lambdaErrorResponse(error)
// //       }

// //       return lambdaErrorResponse({
// //         statusCode: 500,
// //         code: ErrorCode.INTERNAL_SERVER_ERROR,
// //         message: 'internal server error',
// //       })
// //     }
// //   };
// // }

