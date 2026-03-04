import { errorToText } from "../../services/axios-errors.service"
import { badRequest, successRequest } from "../../controllers/protocols"
import { addHistoric, getHistoric } from "../../services/historic.service"
import { CreditsService } from "../../services/credits.service"
import { MongoDbService } from "../../services/mongodb.service"
import { addLog } from "../../services/audit.service"

export async function getHistoricController(req, res, next) {
    const userId = req.user.id
    try {
        
        const offset = parseInt(req.query.offset) || 0
        const limit = parseInt(req.query.limit) || 5
        const response = await getHistoric(userId, offset, limit)
        successRequest(res, 200, response)
    } catch (error) {
        const errorMessage = errorToText(error)
    //    console.log(errorMessage)
        await addLog(userId, errorMessage, {})
        badRequest(res, 500, error)
    }
}

export async function getBalanceController(req, res, next) {
    const userId = parseInt(req.user.id)
    try {
        const creditsService = new CreditsService()
        let response = await creditsService.checkBalance(userId)
        if(response===null || response===undefined) {
          response = await creditsService.initBalance(userId, '0.2')
          await addHistoric({
            userId: req.user.id,
            operation: 'credit',
            description: 'Free Credit',
            total: 0.2,
            createdAt: new Date()
          })
          successRequest(res, 200, { balance: response.toString()})
        }else {
          successRequest(res, 200, { balance: response.toString()})
        }
    } catch (error) {
        const errorMessage = errorToText(error)
    //    console.log(errorMessage)
        await addLog(req.user.id, errorMessage, {})
        badRequest(res, 500, error)
    }
}

export async function getDetailedBalanceController(req, res, next) {
    const userId = parseInt(req.user.id)
    try {
        const creditsService = new CreditsService()
        const balance = await creditsService.getBalance(userId)
        const currentSubscription = await creditsService.getCurrentSubscription(userId)

        // Se não tem saldo, inicializa com free credit
        if(!balance || (balance.total.toString() === '0' && !currentSubscription)) {
          await creditsService.initBalance(userId, '0.2')
          await addHistoric({
            userId: req.user.id,
            operation: 'credit',
            description: 'Free Credit',
            total: 0.2,
            createdAt: new Date()
          })

          const newBalance = await creditsService.getBalance(userId)
          successRequest(res, 200, {
            subscription_balance: newBalance.subscription.toString(),
            recharge_balance: newBalance.recharge.toString(),
            total_balance: newBalance.total.toString(),
            current_subscription: null
          })
        } else {
          successRequest(res, 200, {
            subscription_balance: balance.subscription.toString(),
            recharge_balance: balance.recharge.toString(),
            total_balance: balance.total.toString(),
            current_subscription: currentSubscription
          })
        }
    } catch (error) {
        const errorMessage = errorToText(error)
    //    console.log(errorMessage)
        await addLog(req.user.id, errorMessage, {})
        badRequest(res, 500, error)
    }
}

export async function setBalanceController(req, res, next){
  const userId = parseInt(req.user.id)
  try {
      const balance = req.body.balance
      const creditsService = new CreditsService()
      const response = await creditsService.setBalance(userId, `${balance}`)
      await addHistoric({
        userId: req.user.id,
        operation: 'credit',
        description: `Add ${balance} credits (api).`,
        total: balance,
        createdAt: new Date()
      })
      successRequest(res, 200, { balance: response })
  } catch (error) {
      const errorMessage = errorToText(error)
  //    console.log(errorMessage)
      await addLog(req.user.id, errorMessage, {})
      badRequest(res, 500, error)
  }
}

export async function initBalanceFree(req, res, next){
    const userId = req.body.id
    try {
        const creditsService = new CreditsService()
        let balance = await creditsService.checkBalance(userId)
    //    console.log('BALANCE: ', balance)
        if(balance===null || balance === undefined) {
          balance = await creditsService.initBalance(parseInt(userId), '0.2')
          await addHistoric({
            userId: userId,
            operation: 'credit',
            description: 'Free Credit',
            total: 0.2,
            createdAt: new Date()
          })
          successRequest(res, 200, { balance: balance.toString() })
        }else{
          successRequest(res, 200, { balance: balance.toString() })
        }
    } catch (error) {
        const errorMessage = errorToText(error)
    //    console.log(errorMessage)
        await addLog(userId, errorMessage, {})
        badRequest(res, 500, error)
    }
}

export async function removeCustomer(req, res, next){
  const userId = req.body.id
  try {
    const userId = req.body.id
    const mongodbService = new MongoDbService()
    await mongodbService.deleteMany('balance', { userId })
    await mongodbService.deleteMany('historic', { userId })
    await mongodbService.deleteMany('activate_tools', { userId })
    successRequest(res, 204, null)
  } catch (error) {
      const errorMessage = errorToText(error)
  //    console.log(errorMessage)
      await addLog(userId, errorMessage, {})
      badRequest(res, 500, error)
  }
}

export async function updateBalanceWebhook(req, res, next){
//    console.log(req.body)
    const userId = req.body.customer_id
    const orderId = req.body.id
    const credits = req.body.line_items[0].meta_data?.find((m: any) => m.key === 'credits')?.value
//    console.log('CREDITS: ', credits)
    try {
        const status = req.body.status
        //const productId = req.body.line_items[0].product_id
        if(status==='processing' && credits){
            //const quantity = req.body.line_items[0].quantity
            //const credits = quantity
            const creditsService = new CreditsService()
            const response = await creditsService.insertCredit(parseInt(userId), `${credits}`)
            await addHistoric({
              userId: userId,
              operation: 'credit',
              description: `Buy ${credits} credits. Order ${orderId}.`,
              total: credits,
              createdAt: new Date()
            })
            successRequest(res, 200, { balance: response.toString() })
        }else{
            successRequest(res, 204, null)
        }
    } catch (error) {
        const errorMessage = errorToText(error)
    //    console.log(errorMessage)
        await addLog(userId, errorMessage, {})
        badRequest(res, 500, error)
    }
}

/* const order = {
    "id": 21360,
    "parent_id": 0,
    "status": "failed",
    "currency": "BRL",
    "version": "9.1.4",
    "prices_include_tax": false,
    "date_created": "2024-08-06T03:43:53",
    "date_modified": "2024-08-06T03:43:57",
    "discount_total": "0.00",
    "discount_tax": "0.00",
    "shipping_total": "0.00",
    "shipping_tax": "0.00",
    "cart_tax": "0.00",
    "total": "44.85",
    "total_tax": "0.00",
    "customer_id": 23437,
    "order_key": "wc_order_bZRGs5b5Ay5Ch",
    "billing": {
      "first_name": "Francinaldo da Fonseca Cabral",
      "last_name": "Fonseca Cabral",
      "company": "",
      "address_1": "615 Estrada Da Paciência",
      "address_2": "",
      "city": "rio de janeiro",
      "state": "RJ",
      "postcode": "23580-250",
      "country": "BR",
      "email": "naldo_rn@hotmail.com",
      "phone": "(21) 96943-5536",
      "number": "",
      "neighborhood": "",
      "persontype": "F",
      "cpf": "01401504477",
      "rg": "",
      "cnpj": "",
      "ie": "",
      "birthdate": "",
      "gender": "",
      "cellphone": ""
    },
    "shipping": {
      "first_name": "",
      "last_name": "",
      "company": "",
      "address_1": "",
      "address_2": "",
      "city": "",
      "state": "",
      "postcode": "",
      "country": "",
      "phone": "",
      "number": "",
      "neighborhood": ""
    },
    "payment_method": "woo-mercado-pago-custom",
    "payment_method_title": "Crédito parcelado",
    "transaction_id": "",
    "customer_ip_address": "191.242.111.229",
    "customer_user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "created_via": "checkout",
    "customer_note": "",
    "date_completed": null,
    "date_paid": null,
    "cart_hash": "6a4afbde247b538886a6666a62530c10",
    "number": "21360",
    "meta_data": [
      {
        "id": 289748,
        "key": "mauwoo_coupon_generated",
        "value": ""
      },
      {
        "id": 302620,
        "key": "_billing_cpf",
        "value": "014.015.044-77"
      },
      {
        "id": 302621,
        "key": "is_vat_exempt",
        "value": "no"
      },
      {
        "id": 302622,
        "key": "_wc_order_attribution_source_type",
        "value": "referral"
      },
      {
        "id": 302623,
        "key": "_wc_order_attribution_referrer",
        "value": "http://localhost:4200/"
      },
      {
        "id": 302624,
        "key": "_wc_order_attribution_utm_source",
        "value": "localhost"
      },
      {
        "id": 302625,
        "key": "_wc_order_attribution_utm_medium",
        "value": "referral"
      },
      {
        "id": 302626,
        "key": "_wc_order_attribution_utm_content",
        "value": "/"
      },
      {
        "id": 302627,
        "key": "_wc_order_attribution_session_entry",
        "value": "https://redatudo.online/checkout/"
      },
      {
        "id": 302628,
        "key": "_wc_order_attribution_session_start_time",
        "value": "2024-08-06 03:34:50"
      },
      {
        "id": 302629,
        "key": "_wc_order_attribution_session_pages",
        "value": "3"
      },
      {
        "id": 302630,
        "key": "_wc_order_attribution_session_count",
        "value": "3"
      },
      {
        "id": 302631,
        "key": "_wc_order_attribution_user_agent",
        "value": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
      },
      {
        "id": 302632,
        "key": "_wc_order_attribution_device_type",
        "value": "Desktop"
      },
      {
        "id": 302633,
        "key": "blocks_payment",
        "value": "no"
      },
      {
        "id": 302634,
        "key": "is_production_mode",
        "value": "yes"
      },
      {
        "id": 302635,
        "key": "_used_gateway",
        "value": "woo-mercado-pago-custom"
      },
      {
        "id": 302636,
        "key": "mp_installments",
        "value": "1"
      },
      {
        "id": 302637,
        "key": "mp_transaction_details",
        "value": "44.85"
      },
      {
        "id": 302638,
        "key": "mp_transaction_amount",
        "value": "44.85"
      },
      {
        "id": 302639,
        "key": "mp_total_paid_amount",
        "value": "44.85"
      },
      {
        "id": 302640,
        "key": "_Mercado_Pago_Payment_IDs",
        "value": "84542697392"
      },
      {
        "id": 302641,
        "key": "Mercado Pago - Payment 84542697392",
        "value": "[Date 2024-08-06 03:43:57]/[Amount 44.85]/[Payment Type credit_card]/[Payment Method master]/[Paid 44.85]/[Coupon 0]/[Refund 0]"
      },
      {
        "id": 302642,
        "key": "Mercado Pago - 84542697392 - payment_type",
        "value": "credit_card"
      },
      {
        "id": 302643,
        "key": "Mercado Pago - 84542697392 - installments",
        "value": "1"
      },
      {
        "id": 302644,
        "key": "Mercado Pago - 84542697392 - installment_amount",
        "value": "44.85"
      },
      {
        "id": 302645,
        "key": "Mercado Pago - 84542697392 - transaction_amount",
        "value": "44.85"
      },
      {
        "id": 302646,
        "key": "Mercado Pago - 84542697392 - total_paid_amount",
        "value": "44.85"
      },
      {
        "id": 302647,
        "key": "Mercado Pago - 84542697392 - card_last_four_digits",
        "value": "6351"
      }
    ],
    "line_items": [
      {
        "id": 2342,
        "name": "Credits",
        "product_id": 21347,
        "variation_id": 0,
        "quantity": 3,
        "tax_class": "",
        "subtotal": "44.85",
        "subtotal_tax": "0.00",
        "total": "44.85",
        "total_tax": "0.00",
        "taxes": [],
        "meta_data": [],
        "sku": "credits",
        "price": 14.950000000000001,
        "image": {
          "id": "",
          "src": ""
        },
        "parent_name": null
      }
    ],
    "tax_lines": [],
    "shipping_lines": [],
    "fee_lines": [],
    "coupon_lines": [],
    "refunds": [],
    "payment_url": "https://redatudo.online/checkout/order-pay/21360/?pay_for_order=true&key=wc_order_bZRGs5b5Ay5Ch",
    "is_editable": false,
    "needs_payment": true,
    "needs_processing": true,
    "date_created_gmt": "2024-08-06T03:43:53",
    "date_modified_gmt": "2024-08-06T03:43:57",
    "date_completed_gmt": null,
    "date_paid_gmt": null,
    "currency_symbol": "R$",
    "_links": {
      "self": [
        {
          "href": "https://redatudo.online/wp-json/wc/v3/orders/21360"
        }
      ],
      "collection": [
        {
          "href": "https://redatudo.online/wp-json/wc/v3/orders"
        }
      ],
      "customer": [
        {
          "href": "https://redatudo.online/wp-json/wc/v3/customers/23437"
        }
      ]
    }
} */
