import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import { Telnet } from 'telnet-client';
const connection = new Telnet();

// these parameters are just examples and most probably won't work for your use-case.
const params = {
  host: '127.0.0.1',
  port: 23,
  shellPrompt: '/ # ', // or negotiationMandatory: false
  timeout: 1500,
};

// const res = await connection.exec('uptime');
// console.log('async result:', res);
const addToQueue = async (
  parent: any,
  args: { url: string },
  context: any,
  info: any
) => {
  const uuid = randomUUID();
  const localUrl = `/assets/${uuid}`;
  const item = { uuid, url: localUrl, author: 'idk' };
  const stdout = execSync(`curl ${args.url} -o ${localUrl}`, {
    timeout: 10000,
  }).toString();
  queue.push(item);

  console.log({ stdout });
  return queue;
};

const removeFromQueue = (
  parent: any,
  args: { uuid: string },
  context: any,
  info: any
) => {
  const index = queue.findIndex((item) => item.uuid === args.uuid);
  delete queue[index];
  return args.uuid;
};

const typeDefs = `#graphql
  type QueueItem {
    uuid: ID!
    url: String
    author: String
  }

  type Query {
    currentQueue: [QueueItem]
  }

  type Mutation {
    addToQueue(url: String): [QueueItem]
    removeFromQueue(uuid: ID!): String
  }
`;

const queue = [];

const resolvers = {
  Query: {
    currentQueue: () => queue,
  },
  Mutation: {
    addToQueue,
    removeFromQueue,
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 8080 },
  context: async ({ req, res }) => {
    // try {
    //   await connection.connect(params);
    //   return { connection };
    // } catch (error) {
    //   // handle the throw (timeout)
    //   return {};
    // }
  },
});

console.log(`🚀  Server ready at: ${url}`);
