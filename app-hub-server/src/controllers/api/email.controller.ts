import { badRequest, successRequest } from "../protocols"
import { addLog } from "../../services/audit.service"
import { errorToText } from "../../services/axios-errors.service"
import { codeVerify, confirmEmail, sendUniqueCodeEmail } from "../../services/email-verification.service"

//https://redachat-a3ec00118015.herokuapp.com/webhook-email-verify
export async function sendEmailVerifyController(req, res, next) {
    const userId = req.user.id
    try {
        const email = req.body.email
        const response = await sendUniqueCodeEmail(email)
        successRequest(res, 200, { result: response })
    } catch (error) {
        const errorMessage = errorToText(error)
    //    console.log(errorMessage)
        await addLog(userId, errorMessage, {})
        badRequest(res, 500, error)
    }
}

export async function resendEmailVerifyController(req, res, next) {
    const userId = req.user.id
    try {
        const email = req.user.email
        const response = await sendUniqueCodeEmail(email)
        successRequest(res, 200, { result: response })
    } catch (error) {
        const errorMessage = errorToText(error)
    //    console.log(errorMessage)
        await addLog(userId, errorMessage, {})
        badRequest(res, 500, error)
    }
}

export async function codeVerifyController(req, res, next) {
    const userId = req.user.id
    try {
        const email = req.user.email
        const code = req.body.code
        const confirmed = await codeVerify(email, code)
        if(confirmed) await confirmEmail(email)
        successRequest(res, 200, { confirmed })
    } catch (error) {
        const errorMessage = errorToText(error)
    //    console.log(errorMessage)
        await addLog(userId, errorMessage, {})
        badRequest(res, 500, error)
    }
}

/* 
{
  "id": 23449,
  "date_created": "2024-08-11T01:12:51",
  "date_created_gmt": "2024-08-11T01:12:51",
  "date_modified": "2024-08-11T01:12:52",
  "date_modified_gmt": "2024-08-11T01:12:52",
  "email": "suporte@redatudo.online",
  "first_name": "teste",
  "last_name": "teste",
  "role": "customer",
  "username": "suporte",
  "billing": {
    "first_name": "teste",
    "last_name": "teste",
    "company": "",
    "address_1": "",
    "address_2": "",
    "city": "",
    "postcode": "",
    "country": "",
    "state": "",
    "email": "",
    "phone": "+5521969435536",
    "number": "",
    "neighborhood": "",
    "persontype": "F",
    "cpf": "",
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
    "postcode": "",
    "country": "",
    "state": "",
    "phone": "",
    "number": "",
    "neighborhood": ""
  },
  "is_paying_customer": false,
  "avatar_url": "https://secure.gravatar.com/avatar/0ff42b94e5ac0420b6bd14ebe8cda182?s=96&d=mm&r=g",
  "meta_data": [
    {
      "id": 750692,
      "key": "mauwoo_user_registered_tags",
      "value": "new-user"
    },
    {
      "id": 750693,
      "key": "limite",
      "value": "3000"
    },
    {
      "id": 750694,
      "key": "consumo",
      "value": "0"
    },
    {
      "id": 750695,
      "key": "niver_free",
      "value": "2024-08-11 01:12:51"
    },
    {
      "id": 750696,
      "key": "_wc_order_attribution_source_type",
      "value": "typein"
    },
    {
      "id": 750697,
      "key": "_wc_order_attribution_utm_source",
      "value": "(direct)"
    },
    {
      "id": 750698,
      "key": "_wc_order_attribution_session_entry",
      "value": "https://redatudo.online/"
    },
    {
      "id": 750699,
      "key": "_wc_order_attribution_session_start_time",
      "value": "2024-08-11 00:41:40"
    },
    {
      "id": 750700,
      "key": "_wc_order_attribution_session_pages",
      "value": "3"
    },
    {
      "id": 750701,
      "key": "_wc_order_attribution_session_count",
      "value": "1"
    },
    {
      "id": 750702,
      "key": "_wc_order_attribution_user_agent",
      "value": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
    },
    {
      "id": 750703,
      "key": "_wc_order_attribution_device_type",
      "value": "Desktop"
    },
    {
      "id": 750704,
      "key": "_wcs_subscription_ids_cache",
      "value": []
    },
    {
      "id": 750705,
      "key": "_yoast_wpseo_profile_updated",
      "value": "1723338772"
    },
    {
      "id": 750706,
      "key": "signup_ip",
      "value": "191.242.111.249*"
    },
    {
      "id": 750712,
      "key": "wc_last_active",
      "value": "1723334400"
    },
    {
      "id": 750713,
      "key": "wc_order_count_wp",
      "value": "0"
    },
    {
      "id": 750714,
      "key": "wc_money_spent_wp",
      "value": "0"
    }
  ],
  "_links": {
    "self": [
      {
        "href": "https://redatudo.online/wp-json/wc/v3/customers/23449"
      }
    ],
    "collection": [
      {
        "href": "https://redatudo.online/wp-json/wc/v3/customers"
      }
    ]
  }
}
*/