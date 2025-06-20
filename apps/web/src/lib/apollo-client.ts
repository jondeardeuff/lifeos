import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

// Default GraphQL endpoint
const DEFAULT_GRAPHQL_URI = import.meta.env.VITE_GRAPHQL_URI || 'http://localhost:4000/graphql';

// HTTP link for GraphQL requests
const httpLink = createHttpLink({
  uri: DEFAULT_GRAPHQL_URI,
  credentials: 'include', // Include cookies for sessions
});

// Auth link to add authorization header
const authLink = setContext((_, { headers }) => {
  // Get the authentication token from local storage
  const token = localStorage.getItem('accessToken');

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Error link for handling GraphQL errors
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
        extensions
      );

      // Handle authentication errors
      if (extensions?.code === 'UNAUTHENTICATED') {
        // Clear stored tokens
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        // Optionally redirect to login page
        if (window.location.pathname !== '/auth/login') {
          window.location.href = '/auth/login';
        }
      }
    });
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
    
    // Handle network errors (e.g., server is down)
    if (networkError.message.includes('fetch')) {
      console.error('Network error - check if GraphQL server is running');
    }
  }
});

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Task: {
        fields: {
          // Handle pagination for tasks
          tasks: {
            merge(existing = { edges: [], pageInfo: {} }, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-and-network',
    },
    query: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

// Helper function to refresh the Apollo Client when auth state changes
export const refreshApolloClient = () => {
  apolloClient.refetchQueries({
    include: 'active',
  });
};