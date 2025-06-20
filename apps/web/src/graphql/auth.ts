import { gql } from '@apollo/client';

// Auth fragments
export const AUTH_PAYLOAD_FRAGMENT = gql`
  fragment AuthPayloadFragment on AuthPayload {
    token
    refreshToken
    expiresAt
    user {
      id
      email
      fullName
      avatarUrl
      timezone
      settings
      createdAt
      updatedAt
    }
  }
`;

export const USER_FRAGMENT = gql`
  fragment UserFragment on User {
    id
    email
    fullName
    avatarUrl
    timezone
    settings
    createdAt
    updatedAt
  }
`;

// Authentication mutations
export const LOGIN_MUTATION = gql`
  ${AUTH_PAYLOAD_FRAGMENT}
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      ...AuthPayloadFragment
    }
  }
`;

export const SIGNUP_MUTATION = gql`
  ${AUTH_PAYLOAD_FRAGMENT}
  mutation Signup($input: SignupInput!) {
    signup(input: $input) {
      ...AuthPayloadFragment
    }
  }
`;

export const REFRESH_TOKEN_MUTATION = gql`
  ${AUTH_PAYLOAD_FRAGMENT}
  mutation RefreshToken($input: RefreshTokenInput!) {
    refreshToken(input: $input) {
      ...AuthPayloadFragment
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

// User queries
export const ME_QUERY = gql`
  ${USER_FRAGMENT}
  query Me {
    me {
      ...UserFragment
    }
  }
`;

export const UPDATE_PROFILE_MUTATION = gql`
  ${USER_FRAGMENT}
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      ...UserFragment
    }
  }
`;

// Type definitions for the mutations
export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  email: string;
  password: string;
  fullName: string;
  timezone?: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface UpdateProfileInput {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  timezone?: string;
  settings?: Record<string, unknown>;
}

export interface AuthPayload {
  token: string;
  refreshToken: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
    timezone: string;
    settings: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  };
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  timezone: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}