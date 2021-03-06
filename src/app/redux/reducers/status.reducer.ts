import {AppActions} from '../app.actions';
import {tassign} from 'tassign';

export function statusReducer(state = [], action: any) {

  switch (action.type) {

    case AppActions.RESET_STATUS:
      return tassign({code: null, result: null});

    case AppActions.CREATE_HOUSE:
      return tassign({code: null, result: null});

    case AppActions.CREATED_HOUSE:
      return tassign({code: 'OK', result: action.payload.id});

    case AppActions.UPDATED_HOUSE:
      return tassign({code: 'OK'});

    case AppActions.FAILED_TO_UPDATE_HOUSE:
      return tassign({code: 'ERROR', result: 'Something went wrong'});

    default:
      return state;
  }
}
