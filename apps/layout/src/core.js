import {Map} from 'immutable';

export function incrementCount(state)
{
    return state.update('count', count => count+1);
}

export function decrementCount(state)
{
    return state.update('count', count => count-1);
}

export function updateConfig(state)
{
    return state.update('config', function(config) {
        return
    });
}
