const axios = require('axios')
/**
 * @class Loopy
 */

class Loopy {
  /**
   * @constructor
   * @param {String} [apiUrl='https://www.cbaloop.com'] The base url for all requests
   */
  constructor(apiUrl = 'https://www.cbaloop.com') {
    this.apiUrl = apiUrl
    this.instance = axios.create({
      baseURL: this.apiUrl,
      timeout: 5000
    })
    this.user = null
  }
  /**
   * @async
   * @name login
   * @method
   * @description Login to loop, to get auth-token
   * @param  {String}  userName The email used to register on loop
   * @param  {String}  password The loop password
   * @return {Object}
   */
  async login(userName, password){
    const resp = await axios.post(`${this.apiUrl}/customer/login`, {
      userName,
      password
    })
    if (resp.data.returnCode === 3509) throw new Error(resp.data.returnMessage)
    const authCode = resp.headers['auth-token']
    this.user = resp.data
    this.setAuthCode(authCode)
    return resp
  }

  /**
   * Set the authCode manually
   * This is because Loop rejects logins which are around 5min apart
   * You can store the authCode and load it later
   * @name setAuthCode
   * @description Manually set the authCode
   * @method
   * @param {String} code The authCode
   * @return {Loopy}
   */
  setAuthCode(code){
    if(!code) throw new Error('Cannot set Authorization to null')
    this.instance.defaults.headers.common['Authorization'] = 'Bearer' + code
    return this
  }

  /**
   * Set the user object manually
   * This is because Loop rejects logins which are around 5min apart
   * You can store the user object and load it later
   * @name setUser
   * @method
   * @description Manually set the user object
   * @param {Object} user The user object
   * @return {Loopy}
   */
  setUser(user){
    if(!user || !user.customerId) throw new Error('User object cannot be empty')
    this.user = user
    return this
  }

  /**
   * Fetch the loop account balance
   * @name checkBalance
   * @method
   * @description Returns the account balance of the loop account
   * @return {Promise}
   */
  checkBalance() {
    if(!this.user) throw new Error('User object cannot be empty. Please try logging in')
    const { customerId } = this.user
    return instance.post('/customer/accounts/getAccountBalance', { customerId })
  }

  /**
   * Fetch your loop income & expences
   * @name checkBalance
   * @method
   * @description Fetches Income and expenditure grouped by month
   * @param  {String} [fromDate='1970-01-01']  Start date of transaction listings
   * @return {Promise}
   */
  checkExpenditure(fromDate = '1970-01-01') {
    if(!this.user) throw new Error('User object cannot be empty. Please try logging in')
    return this.instance.get(`/pfm-web/analysis/expensesincomes/get.action?params.fromDate=${fromDate}`)
  }

  /**
   * Get the list of Accounts attached to your Loop account
   * @name getAccounts
   * @description Get the list of accounts in your loop account
   * @method
   * @return {Promise}
   */
  getAccounts() {
    if(!this.user) throw new Error('User object cannot be empty. Please try logging in')
    return this.instance.get(`/pfm-web/accounts/get/all.action`)
  }

  /**
   * @name getCategories
   * @method
   * @description Fetches oall available categories. Important during sending money
   * @return {Promise}
   */
  getCategories() {
    if(!this.user) throw new Error('User object cannot be empty. Please try logging in')
    return this.instance.get(`/customer/transfers/getCategories`)
  }

  /**
   * Get Transfer Types
   * @name getTransferTypes
   * @method
   * @description returns all posible transferMethods used by Loop
   * @return {Promise}
   */
  getTransferTypes() {
    if(!this.user) throw new Error('User object cannot be empty. Please try logging in')
    return this.instance.get(`/customer/transfers/getTransferTypes`)
  }

  /**
   * Gets Banks and branches. Important for RTGS and EFT
   * @name getBankAndBranches
   * @method
   * @description Gets Banks and branches. Important for RTGS and EFT
   * @return {Promise}
   */
  getBankBranches(){
    if(!this.user) throw new Error('User object cannot be empty. Please try logging in')
    return this.instance.get(`/customer/beneficiaries/getBankAndBranches`)
  }

  /**
   * @name getMsisdnPesalinks
   * @method
   * @description this returns all possible pesalink channels to send a user money.
   * This should be injected to sortCode for sendViaPesaLink
   * @param  {String} msisdn The phone number you want to get details
   * @return {Promise}
   */
  getMsisdnPesalinks(msisdn){
    if(!this.user) throw new Error('User object cannot be empty. Please try logging in')
    const { customerId } = this.user
    return this.instance.post('/customer/pesalink/bankList', {
      customerId,
      msisdn
    })
  }

  /**
   * This checks if a number is a loop user. Transfers between loop are 0.00 so its better
   * @name checkIfLoopNumber
   * @method
   * @description  checks if a number is a loop user. Transfers between loop are 0.00 so its gonna save you some money
   * @param  {String} msisdn The phone number you want to get details
   * Returns 6002 returnCode if not registered
   * @return {Promise}
   */
  checkIfLoopNumber(msisdn){
    if(!this.user) throw new Error('User object cannot be empty. Please try logging in')
    const { customerId } = this.user
    return this.instance.post('/customer/transfers/validateLoopMobileNumber', {
      customerId,
      msisdn
    })
  }

  /**
   * Send Money to Mobile Money directly eg using B2C in mPesa
   * @name sendToMobileMoney
   * @description Moves money from Loop to a mobile number
   * @method
   * @param  {Number} msisdn                        The mobileNumber recieving the money
   * @param  {Number} amount                        The amount of money being sent
   * @param  {String} [purpose='Cash Transfer']     The reason for this transaction
   * @return {Promise}
   */
  sendToMobileMoney(msisdn, amount, purpose = 'Cash Transfer'){
    if(!this.user) throw new Error('User object cannot be empty. Please try logging in')
    const { customerId } = this.user
    return this.instance.post(`/customer/transfers/transferToMobile`, {
      customerId,
      amount,
      categoryId: 39,
      categoryName: 'Cash, Transfers',
      frequencyOfPayment: 0,
      isRegularPayment: 0,
      mobileNumber: msisdn,
      mobileNumberCCode: 'KE',
      purpose,
      subcategoryId: 43,
      subcategoryName: 'Internal Money Transfer',
      transferMethod: 4 // Mobile I Guess
    })
  }

  /**
   * Send Money to someone via sendViaPesaLink
   * @name sendViaPesaLink
   * @description Moves money from Loop to a bank
   * @method
   * @param  {Number} msisdn                        The mobileNumber recieving the money
   * @param  {Number} amount                        The amount of money being sent
   * @param  {Number} sortCode                      The pesalink channel to use. @see {getMsisdnPesalinks}
   * @param  {String} [purpose='Cash Transfer']     The reason for this transaction
   * @return {Promise}
   */
  sendViaPesaLink(msisdn, amount, sortCode purpose = 'Cash Transfer'){
    if(!this.user) throw new Error('User object cannot be empty. Please try logging in')
    const { customerId } = this.user
    return this.instance.post(`/customer/transfers/transferToMobile`, {
      customerId,
      amount,
      categoryId: 39,
      categoryName: 'Cash, Transfers',
      frequencyOfPayment: 0,
      isRegularPayment: 0,
      sortCode: 40401000, //Not sure I think this represents KCB or something
      mobileNumber: msisdn,
      mobileNumberCCode: 'KE',
      purpose,
      subcategoryId: 43,
      subcategoryName: 'Internal Money Transfer',
      transferMethod: 1 //pesalink i guess
    })
  }

  sendToBankViaRtgs(){
    // TODO: not yet performed
  }

  sendToBankViaEft(){
    // TODO: Not yet Done
  }
}
