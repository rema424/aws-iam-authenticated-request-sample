const aws4 = require('aws4');
const axios = require('axios');

const apiGatewayHost =
  process.env.API_GATEWAY_HOST || 'xxxxxxxx.execute-api.ap-northeast-1.amazonaws.com';
const apiGatewayStage = process.env.API_GATEWAY_STAGE || 'Dev';

/**
 * APIリクエスト用のリクエストオプションオブジェクトを生成する
 */
const generateRequestOptions = (method, inputPath, data = {}) => {
  const path = `/${apiGatewayStage}${inputPath}`;
  const body = JSON.stringify(data);
  const url = `https://${apiGatewayHost}${path}`;
  const headers = { 'content-type': 'application/json' };

  return { host: apiGatewayHost, method, path, body, url, data, headers };
};

/**
 * 一時認証情報を基にIAM署名を作成し、APIリクエストオプションオブジェクトのヘッダーに埋め込んで返却する
 */
const generateSignedOptions = (method, inputPath, data = {}) => {
  // 環境変数より一時認証情報を取得する
  const credentials = {
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  };

  // リクエストオプションを生成する
  const options = generateRequestOptions(method, inputPath, data);

  // 署名付きリクエストオプションオブジェクトを生成する
  const signedOptions = aws4.sign(options, credentials);
  delete signedOptions.headers.Host;

  return signedOptions;
};

/**
 * Lambda handler
 * パブリックに公開する API Gateway(Lambda) から
 * プライベートな API Gateway(IAM認証) にアクセスするサンプル
 */
exports.handler = async event => {
  // 署名付きリクエストオプションを生成する
  const signedOptions = generateSignedOptions('GET', '/', { a: 'aaaaa' });
  console.log('signedOptions: ', JSON.stringify(signedOptions, null, 2));

  try {
    const { data } = await axios.request(signedOptions);
    console.log('data: ', data);
    return data;
  } catch (err) {
    console.log('err: ', err);
    throw new Error(err.message);
  }
};
