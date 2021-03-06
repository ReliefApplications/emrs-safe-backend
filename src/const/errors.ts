/*  Errors
*/
const errors = {
    userNotLogged: 'You must be connected.',
    permissionNotGranted: 'Permission not granted.',
    invalidEditRolesArguments: 'Either permissions or channels must be provided.',
    invalidAddFormArguments: 'Form should either correspond to a new resource or existing resource.',
    invalidEditResourceArguments: 'Either fields or permissions must be provided.',
    invalidAddDashboardArguments: 'Dashboard name must be provided.',
    invalidEditDashboardArguments: 'Either name or structure must be provided.',
    invalidAddApplicationArguments: 'Application name must be provided.',
    invalidEditApplicationArguments: 'Either name, status, pages, settings or permissions must be provided.',
    invalidEditRecordArguments: 'Either data or version must be provided.',
    invalidAddPageArguments: 'Page type must be an available type and linked application ID must be provided.',
    invalidEditPageArguments: 'Either name or permissions must be provided.',
    invalidAddWorkflowArguments: 'Page id must be provided.',
    invalidEditWorkflowArguments: 'Either name or steps must be provided.',
    invalidAddStepArguments: 'Step type must be an available type and linked workflow ID must be provided.',
    invalidEditStepArguments: 'Either name, type, content or permissions must be provided.',
    invalidSeeNotificationArguments: 'Notification ID must be provided.',
    invalidSeeNotificationsArguments: 'Notifications IDs must be provided.',
    invalidPublishNotificationArguments: 'Action, content and channel arguments must all be provided.',
    invalidCORS: 'The CORS policy for this site does not allow access from the specified Origin.',
    dataNotFound: 'Data not found',
    resourceDuplicated: 'An existing resource with that name already exists.',
    roleDuplicated: 'A role with that name already exists.',
    tooManyRoles: 'Only one role per app can be assigned.',
    pageTypeError: 'The page passed in argument is not a workflow type.',
    missingDataField: 'Please add a value name to all questions, inside Data tab.',
    missingFile: 'No file detected.',
    dataFieldDuplicated (name: string) { return `Data name duplicated : ${name}. Please provide different value names for all questions.`; },
    dataFieldCannotBeDeleted (name: string) { return `Data field cannot be deleted : ${name}. Some inherited forms implement this field.`; },
    coreFieldMissing (name: string) { return `Core field missing : ${name}. Please implement this field.`; },
    invalidConversion: 'Cannot convert this record to this target form type.',
    usageOfProtectedName: 'This name is protected and cannot be used. Please choose a different name.',
    invalidAddApplicationName: 'The name can only consist of alphanumeric characters. Please choose a different name.',
    invalidEmailsInput: 'Wrong format detected. Please provide valid emails.',
    invalidPaginationArguments: 'Please provider valid integers for first and offset arguments.',
    invalidAddApiConfigurationArguments: 'API name must be provided.',
    invalidEditApiConfigurationArguments: 'Either name, status, authType, settings or permissions must be provided.',
    fileExtensionNotAllowed: 'File extension not allowed',
    fileCannotBeUploaded: 'File cannot be uploaded.',
    fileSizeLimitReached: 'File size exceed 5MB',
    authenticationTokenNotFound: 'Missing bearer token.'
};

export default errors;
