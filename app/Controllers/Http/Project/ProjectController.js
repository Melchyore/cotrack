'use strict'

const Config = use('Config')
const { statuses, priorities } = Config.get('ticket')
const { phases } = Config.get('project')
const { validateAll } = use('Validator')
const Project = use('App/Models/Project')
const Ticket = use('App/Models/Ticket')
const User = use('App/Models/User')
const MarkdownServices = use('App/Services/markdownServices')

class ProjectController {
  async index({ auth, view, response }) {
    let projectsActive = []
    let projectsInactive = []

    if(auth.user.is_admin) {
      projectsActive = await Project.query()
        .where('is_active', true)
        .with('projectAuthor', (builder) => {
          builder.select('id', 'first_name', 'last_name')
        })
        .fetch()

      projectsInactive = await Project.query()
        .where('is_active', false)
        .with('projectAuthor', (builder) => {
          builder.select('id', 'first_name', 'last_name')
        })
        .fetch()
    } else {
      projectsActive = await Project.query()
        .where('is_active', true)
        .andWhere(function() {
          this
            .where('author_id', auth.user.id)
            .orWhereHas('members', (builder) => {
              builder.where('user_id', auth.user.id)
            })
        })
        .with('projectAuthor', (builder) => {
          builder.select('id', 'first_name', 'last_name')
        })
        .fetch()

      projectsInactive = await Project.query()
        .where('is_active', false)
        .andWhere(function() {
          this
            .where('author_id', auth.user.id)
            .orWhereHas('members', (builder) => {
              builder.where('user_id', auth.user.id)
            })
        })
        .with('projectAuthor', (builder) => {
          builder.select('id', 'first_name', 'last_name')
        })
        .fetch()
    }

    return view.render('projects.index', {
      projectsActive: projectsActive.toJSON(),
      projectsInactive: projectsInactive.toJSON()
    })
  }

  async show({ params, auth, session, view, response }) {
    const project = await Project.query()
      .where('id', params.id)
      .with('projectAuthor', (builder) => {
        builder.select('id', 'first_name', 'last_name')
      })
      .with('members', (builder) => {
        builder.select('id', 'first_name', 'last_name')
      })
      .first()

    if(project) {
      const statusesOpen = await Ticket.ticketStatuses(statuses, 'open')

      const ticketsOpen = await Ticket.query()
        .where('project_id', project.id)
        .whereIn('status', statusesOpen)
        .with('ticketAuthor', (builder) => {
          builder.select('id', 'first_name', 'last_name')
        })
        .with('ticketRecipient', (builder) => {
          builder.select('id', 'first_name', 'last_name')
        })
        .orderBy('created_at', 'desc')
        .fetch()

      const statusesClosed = await Ticket.ticketStatuses(statuses, 'closed')

      const ticketsClosed = await Ticket.query()
        .where('project_id', project.id)
        .whereIn('status', statusesClosed)
        .with('ticketAuthor', (builder) => {
          builder.select('id', 'first_name', 'last_name')
        })
        .with('ticketRecipient', (builder) => {
          builder.select('id', 'first_name', 'last_name')
        })
        .orderBy('created_at', 'desc')
        .fetch()

      project.description = await MarkdownServices.convertToHtml(project.description, 'description')

      return view.render('projects.show', {
        project: project.toJSON(),
        ticketsOpen: ticketsOpen.toJSON(),
        ticketsClosed: ticketsClosed.toJSON(),
        priorities: priorities
      })
    }

    session.flash({
      notification: {
        type: 'danger',
        message: 'Das Projekt kann nicht angezeigt werden.'
      }
    })

    return response.redirect('back')
  }

  async create({ view }) {
    const members = await User.query()
      .select('id', 'first_name', 'last_name')
      .whereNot('is_active', false)
      .fetch()

    return view.render('projects.create', {
      members: members.toJSON(),
      phases: phases
    })
  }

  async store({ request, auth, session, response }) {
    const validation = await validateAll(request.all(), {
      title: 'required',
      description: 'required',
      code: 'required|unique:projects, code'
    })

    if (validation.fails()) {
      session.withErrors(validation.messages()).flashAll()

      return response.redirect('back')
    }

    let isActive = request.input('is_active')
    isActive = (isActive == 'on')? true : false;

    // Create Project
    const project = await Project.create({
      title: request.input('title'),
      description: request.input('description'),
      code: request.input('code'),
      phase: request.input('phase'),
      is_active: isActive,
      author_id: auth.user.id
    })

    await project.members().attach(request.input('members'))

    session.flash({
      notification: {
        type: 'success',
        message: 'Das Projekt wurde erfolgreich angelegt.'
      }
    })

    return response.route('projectsShow', { id: project.id })
  }

  async edit({ params, view }) {
    const project = await Project.query()
      .where('id', params.id)
      .with('members', (builder) => {
        builder.select('id', 'first_name', 'last_name')
      })
      .first()

    const users = await User.query()
      .select('id', 'first_name', 'last_name')
      .whereNot('is_active', false)
      .fetch()

    return view.render('projects.edit', {
      project: project.toJSON(),
      users: users.toJSON(),
      phases: phases
    })
  }

  async update({ params, request, session, response }) {

    const validation = await validateAll(request.all(), {
      title: 'required',
      description: 'required'
    })

    if (validation.fails()) {
      session.withErrors(validation.messages()).flashAll()

      return response.redirect('back')
    }

    const project = await Project.find(params.id)

    let isActive = request.input('is_active')
    isActive = (isActive == 'on')? true : false;

    project.title = request.input('title')
    project.description = request.input('description')
    project.code = request.input('code')
    project.phase = request.input('phase')
    project.is_active = isActive

    await project.save()

    await project.members().sync(request.input('members'))

    session.flash({
      notification: {
        type: 'success',
        message: 'Die Änderungen wurden erfolgreich übernommen.'
      }
    })

    return response.route('projectsShow', { id: project.id })
  }
}

module.exports = ProjectController
