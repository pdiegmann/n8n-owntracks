import {
  IAuthenticateGeneric,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class OwnTracksApi implements ICredentialType {
  name = 'ownTracksApi';
  displayName = 'OwnTracks API';
  documentationUrl = 'https://github.com/pdiegmann/n8n-owntracks';
  properties: INodeProperties[] = [
    {
      displayName: 'Backend URL',
      name: 'backendUrl',
      type: 'string',
      default: 'http://localhost:3000',
      placeholder: 'http://localhost:3000',
      description: 'The URL of your OwnTracks backend server',
    },
    {
      displayName: 'Authentication',
      name: 'authentication',
      type: 'options',
      options: [
        {
          name: 'None',
          value: 'none',
        },
        {
          name: 'Basic Auth',
          value: 'basicAuth',
        },
      ],
      default: 'none',
    },
    {
      displayName: 'Username',
      name: 'username',
      type: 'string',
      default: '',
      displayOptions: {
        show: {
          authentication: ['basicAuth'],
        },
      },
    },
    {
      displayName: 'Password',
      name: 'password',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      displayOptions: {
        show: {
          authentication: ['basicAuth'],
        },
      },
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '={{$credentials.authentication === "basicAuth" ? "Basic " + Buffer.from($credentials.username + ":" + $credentials.password).toString("base64") : undefined}}',
      },
    },
  };
}
