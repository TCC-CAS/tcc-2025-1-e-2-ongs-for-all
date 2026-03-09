import { FastifyInstance } from 'fastify'
import pointOfView from '@fastify/view'
import handlebars from 'handlebars'
import path from 'path'

export default async function (fastify: FastifyInstance) {
  const viewsPath = path.join(__dirname, '..', 'views')

  /*
  ========================================
  HELPERS DO HANDLEBARS
  ========================================
  */

  handlebars.registerHelper('ifCond', function (this: any, a: any, b: any, options: any) {
    return a === b ? options.fn(this) : options.inverse(this)
  })

  handlebars.registerHelper('eq', function (a: any, b: any) {
    return a === b
  })

  /*
  ========================================
  VIEW ENGINE
  ========================================
  */

  fastify.register(pointOfView, {
    engine: {
      handlebars,
    },
    viewExt: 'hbs',
    root: viewsPath,

    options: {
      partials: {
        homenavbar: 'partials/homenavbar.hbs',
      },
    },

    defaultContext: {
      title: 'ONG For All',
    },
  })
}