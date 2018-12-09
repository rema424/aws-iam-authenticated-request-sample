const axios = require('axios');
const aws4 = require('aws4');
const express = require('express');

const app = express();

const port = process.env.PORT || 8000;
const apiGatewayHost =
  process.env.API_GATEWAY_HOST || 'xxxxxxxx.execute-api.ap-northeast-1.amazonaws.com';
const apiGatewayStage = process.env.API_GATEWAY_STAGE || 'Dev';

/**
 * EC2のメタデータからアタッチされたロール名を取得する
 * https://docs.aws.amazon.com/ja_jp/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html#instance-metadata-security-credentials
 * https://docs.aws.amazon.com/ja_jp/AWSEC2/latest/UserGuide/ec2-instance-metadata.html#instancedata-data-categories
 */
const getRoleNameFromEC2MetaData = async () => {
  const url = 'http://169.254.169.254/latest/meta-data/iam/security-credentials/';
  const { data } = await axios.get(url);
  return data;
};

/**
 * ロール名を基にEC2メタデータより一時認証情報を取得する
 */
const getTemporarySecurityCredentialsByRoleName = async roleName => {
  const url = `http://169.254.169.254/latest/meta-data/iam/security-credentials/${roleName}`;
  const { data } = await axios.get(url);
  return {
    accessKeyId: data.AccessKeyId,
    secretAccessKey: data.SecretAccessKey,
    sessionToken: data.Token,
  };
};

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
const generateSignedOptions = async (method, inputPath, data = {}) => {
  // メタデータよりロール名を取得する
  const roleName = await getRoleNameFromEC2MetaData();

  // 一時認証情報の取得とリクエストオプションの生成を並列処理で行う
  const [credentials, options] = await Promise.all([
    getTemporarySecurityCredentialsByRoleName(roleName),
    generateRequestOptions(method, inputPath, data),
  ]);

  // 署名付きリクエストオプションオブジェクトを生成する
  const signedOptions = aws4.sign(options, credentials);
  delete signedOptions.headers.Host;

  return signedOptions;
};

/**
 * サーバー起動時に実行するアプリケーション初期化メソッド
 */
const main = () => {
  app.get('/', async (req, res) => {
    try {
      // 署名付きリクエストオプションを生成する
      const signedOptions = await generateSignedOptions('GET', '/', { a: 'aaaaa' });
      // APIへのリクエストを実行する
      const { data } = await axios.request(signedOptions);
      res.json(data);
    } catch (err) {
      res.json({ message: err.message });
    }
  });

  // サーバー起動
  app.listen(port);
  console.log(`Server running at http://localhost:${port}/`);
};

main();
