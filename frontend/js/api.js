// ─── API CLIENT ───────────────────────────────────────────────────────────────
const API = {
  base: '/api',
  token: null,

  headers() {
    return {
      'Content-Type': 'application/json',
      ...(this.token ? { 'x-auth-token': this.token } : {})
    };
  },

  async get(path) {
    const r = await fetch(this.base + path, { headers: this.headers() });
    return r.json();
  },

  async post(path, body) {
    const r = await fetch(this.base + path, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body)
    });
    return r.json();
  },

  async delete(path) {
    const r = await fetch(this.base + path, {
      method: 'DELETE',
      headers: this.headers()
    });
    return r.json();
  },

  // AUTH
  async login(email, password)   { return this.post('/auth/login', { email, password }); },
  async register(data)           { return this.post('/auth/register', data); },
  async logout()                 { return this.post('/auth/logout', {}); },
  async getMe()                  { return this.get('/auth/me'); },

  // PLAYER
  async getProfile()             { return this.get('/player/profile'); },
  async getPlayerByNick(nick)    { return this.get('/player/' + encodeURIComponent(nick)); },
  async trainSkill(skill)        { return this.post('/player/train-skill', { skill }); },
  async moveRegion(regionId)     { return this.post('/player/move-region', { regionId }); },
  async getLeaderboard()         { return this.get('/player/leaderboard/top'); },
  async getNotifications()       { return this.get('/player/notifications/list'); },
  async markNotificationsRead()  { return this.post('/player/notifications/mark-read', {}); },

  // WORK
  async getJobs()                            { return this.get('/work/available'); },
  async doWork(factoryId, energyAmount)      { return this.post('/work/work', { factoryId, energyAmount }); },
  async resign(factoryId)                    { return this.post('/work/resign', { factoryId }); },

  // AUTOWORK
  async getAutoworkStatus()      { return this.get('/autowork/status'); },
  async startAutowork(factoryId) { return this.post('/autowork/start', { factoryId }); },
  async stopAutowork()           { return this.post('/autowork/stop', {}); },

  // FACTORY
  async getMyFactories()                     { return this.get('/factory/my'); },
  async getRegionFactories(regionId)         { return this.get('/factory/region/' + regionId); },
  async getFactory(id)                       { return this.get('/factory/' + id); },
  async createFactory(type, regionId, name)  { return this.post('/factory/create', { type, regionId, name }); },
  async upgradeFactory(factoryId)            { return this.post('/factory/upgrade', { factoryId }); },
  async setSalary(factoryId, salary, mode)   { return this.post('/factory/set-salary', { factoryId, salary, salaryMode: mode }); },
  async toggleFactory(factoryId)             { return this.post('/factory/toggle-active', { factoryId }); },
  async withdrawFactory(fId, rType, amount)  { return this.post('/factory/withdraw', { factoryId: fId, resourceType: rType, amount }); },
  async getAllFactories()                     { return this.get('/factory/all/list'); },

  // REGION
  async getAllRegions()           { return this.get('/region/all'); },
  async getRegion(id)            { return this.get('/region/' + id); },
  async getRegionStats(id)       { return this.get('/region/' + id + '/stats'); },

  // MARKET
  async getListings()                                    { return this.get('/market/listings'); },
  async sellResource(resourceType, amount, pricePerUnit) { return this.post('/market/sell', { resourceType, amount, pricePerUnit }); },
  async buyListing(listingId, amount)                    { return this.post('/market/buy', { listingId, amount }); },
  async cancelListing(listingId)                         { return this.delete('/market/cancel/' + listingId); },

  // CHAT
  async getChat(channel)         { return this.get('/chat/' + channel); },
  async sendChat(channel, text)  { return this.post('/chat/' + channel, { text }); },

  // ECONOMY
  async getEconomyStats()        { return this.get('/economy/stats'); },
  async getMiningStats()         { return this.get('/economy/mining'); },

  // TRANSACTIONS
  async getTransactionHistory(type, currency, page) {
    let q = '/transactions/history?limit=30';
    if (type)     q += '&type=' + type;
    if (currency) q += '&currency=' + currency;
    if (page)     q += '&page=' + page;
    return this.get(q);
  },
  async getTransactionSummary()                              { return this.get('/transactions/summary'); },
  async sendMoney(toNickname, amount, note)                  { return this.post('/transactions/send-money', { toNickname, amount, note }); },
  async sendGold(toNickname, amount, note)                   { return this.post('/transactions/send-gold', { toNickname, amount, note }); },
  async sendResource(toNickname, resourceType, amount, note) { return this.post('/transactions/send-resource', { toNickname, resourceType, amount, note }); },
  async getPlayerTransactions(nickname)                      { return this.get('/transactions/player/' + encodeURIComponent(nickname)); },

  // STORE
  async getStorePackages()       { return this.get('/store/packages'); },
  async submitPayment(data)      { return this.post('/store/submit-payment', data); },
  async submitDonation(data)     { return this.post('/store/submit-donation', data); },
  async getMyPurchases()         { return this.get('/store/my-purchases'); },

  // POLITICS
  async getPoliticalSystems()          { return this.get('/politics/systems'); },
  async getShields()                   { return this.get('/politics/shields'); },
  async getAllStates()                  { return this.get('/politics/states'); },
  async getState(id)                   { return this.get('/politics/states/' + id); },
  async getMyState()                   { return this.get('/politics/my-state'); },
  async getLawTypes()                  { return this.get('/politics/law-types'); },
  async getStateLaws(stateId)          { return this.get('/politics/laws/' + stateId); },
  async foundState(data)               { return this.post('/politics/found', data); },
  async joinState(stateId)             { return this.post('/politics/join', { stateId }); },
  async leaveState()                   { return this.post('/politics/leave', {}); },
  async transferLeadership(toNickname) { return this.post('/politics/transfer-leadership', { toNickname }); },
  async updateState(data)              { return this.post('/politics/update-state', data); },
  async transferBudget(amount)         { return this.post('/politics/transfer-budget', { amount }); },
  async proposeLaw(data)               { return this.post('/politics/propose-law', data); },
  async voteLaw(lawId, vote)           { return this.post('/politics/vote', { lawId, vote }); },

  // REGION (extended)
  async getMyRegion()                          { return this.get('/region/my'); },
  async requestResidency()                     { return this.post('/region/request-residency', {}); },
  async approveResidency(playerId, regionId, approve) { return this.post('/region/approve-residency', { playerId, regionId, approve }); },

  // POLITICS2
  async getPartiesByRegion(rid)               { return this.get('/politics2/parties/' + rid); },
  async getMyParty()                          { return this.get('/politics2/my-party'); },
  async getElectionsByRegion(rid)             { return this.get('/politics2/elections/' + rid); },
  async getParliament(stateId)                { return this.get('/politics2/parliament/' + stateId); },
  async foundParty(data)                      { return this.post('/politics2/found-party', data); },
  async joinParty(partyId)                    { return this.post('/politics2/join-party', { partyId }); },
  async leaveParty()                          { return this.post('/politics2/leave-party', {}); },
  async registerCandidate(electionId)         { return this.post('/politics2/register-candidate', { electionId }); },
  async votePrimary(electionId, candidateId)  { return this.post('/politics2/vote-primary', { electionId, candidateId }); },
  async voteParliamentary(electionId, partyId){ return this.post('/politics2/vote-parliamentary', { electionId, partyId }); },
  async votePresidential(electionId, cId)     { return this.post('/politics2/vote-presidential', { electionId, candidateId: cId }); },
  async parliamentVoteLaw(lawId, vote)        { return this.post('/politics2/parliament-vote-law', { lawId, vote }); },

  // RANKINGS
  async getRankings(category, by)      { return this.get('/rankings/' + category + '?by=' + (by||'')); },

  // WAR
  async getWarList()                    { return this.get('/war/list'); },
  async getMyStateWars()                { return this.get('/war/my-state'); },
  async getWar(warId)                   { return this.get('/war/' + warId); },
  async attackPlayer(targetNickname)    { return this.post('/war/attack', { targetNickname }); },
  async surrenderWar(warId)             { return this.post('/war/surrender', { warId }); },
  async startWar(defenderStateId)       { return this.post('/war/start', { defenderStateId }); },

  // ADMIN
  async getAdminStats()          { return this.get('/admin/stats'); },
  async getAdminPlayers()        { return this.get('/admin/players'); },
  async getAdminPayments()       { return this.get('/admin/payments'); },
  async getAdminDonations()      { return this.get('/admin/donations'); }
};
