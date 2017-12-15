export function setState (state) {
  return {
    type: 'SET_STATE',
    state
  }
}

export function incrementCount () {
  return {
    type: 'INCREMENT_COUNT'
  }
}

export function decrementCount () {
  return {
    type: 'DECREMENT_COUNT'
  }
}

export function updateConfig () {
  return {
    type: 'UPDATE_CONFIG'
  }
}

export function pushMetOClient () {
  return {
    type: 'PUSH_METOCLIENT'
  }
}

export function setMetOClient () {
  return {
    type: 'SET_METOCLIENT'
  }
}

export function unsetMetOClient () {
  return {
    type: 'UNSET_METOCLIENT'
  }
}

export function updateMetOClient () {
  return {
    type: 'UPDATE_METOCLIENT'
  }
}
