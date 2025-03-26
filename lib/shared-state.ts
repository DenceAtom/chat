const activeUsers = new Map()
const activeCalls = new Map()

const activeUsersUpdateCallbacks = []
const activeCallsUpdateCallbacks = []

function updateUserState(userData) {
  activeUsers.set(userData.id, userData)
  notifyActiveUsersUpdate()
}

function disconnectUser(userId) {
  activeUsers.delete(userId)
  notifyActiveUsersUpdate()
}

function updateCallState(callData) {
  activeCalls.set(callData.id, callData)
  notifyActiveCallsUpdate()
}

function endCall(callId) {
  activeCalls.delete(callId)
  notifyActiveCallsUpdate()
}

function getActiveUsers() {
  return Array.from(activeUsers.values())
}

function getActiveCalls() {
  return Array.from(activeCalls.values())
}

function onActiveUsersUpdate(callback) {
  activeUsersUpdateCallbacks.push(callback)
  return () => {
    activeUsersUpdateCallbacks.filter((cb) => cb !== callback)
  }
}

function onActiveCallsUpdate(callback) {
  activeCallsUpdateCallbacks.push(callback)
  return () => {
    activeCallsUpdateCallbacks.filter((cb) => cb !== callback)
  }
}

function notifyActiveUsersUpdate() {
  activeUsersUpdateCallbacks.forEach((callback) => {
    callback(getActiveUsers())
  })
}

function notifyActiveCallsUpdate() {
  activeCallsUpdateCallbacks.forEach((callback) => {
    callback(getActiveCalls())
  })
}

const sharedStateService = {
  updateUserState,
  disconnectUser,
  updateCallState,
  endCall,
  getActiveUsers,
  getActiveCalls,
  onActiveUsersUpdate,
  onActiveCallsUpdate,
  requestCurrentState: () => {}, // Placeholder function
}

export default sharedStateService

